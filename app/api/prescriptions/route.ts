import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizePrescription(p: any) {
  const patient = p.patient || {}
  const patientUser = patient.user || {}
  const doctor = p.doctor || {}
  const hospital = p.hospital || {}

  return {
    ...p,
    _id: p.id,
    tokenNumber: p.token_number,
    patientName: patientUser.name || 'Patient',
    doctorName: doctor.name || 'Doctor',
    hospitalName: hospital.name || 'Hospital',
    patient: {
      ...patient,
      _id: patient.id,
      name: patientUser.name || 'Patient',
      user: patientUser,
    },
    doctor: {
      ...doctor,
      _id: doctor.id,
    },
    hospital: {
      ...hospital,
      _id: hospital.id,
    },
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const patientId = searchParams.get('patientId')
    const role = (token as any).role

    let query = supabaseAdmin
      .from('prescriptions')
      .select(`
        *,
        patient:patients(id, uhid, user:users(id, name, email, phone)),
        doctor:users!prescriptions_doctor_id_fkey(id, name, specialization),
        hospital:hospitals(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (patientId) {
      query = query.eq('patient_id', patientId)
    } else if (role === 'doctor') {
      query = query.eq('doctor_id', (token as any).id)
    } else if (role === 'patient') {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('user_id', (token as any).id)
        .single()
      if (!patient) return NextResponse.json({ prescriptions: [] })
      query = query.eq('patient_id', patient.id)
    } else if (['hospital_admin', 'receptionist', 'pharmacy'].includes(role)) {
      const hospitalId = (token as any).hospitalId
      if (hospitalId) query = query.eq('hospital_id', hospitalId)
    }

    const { data: prescriptions, error } = await query
    if (error) {
      console.error('[Prescriptions GET Error]:', error)
      return NextResponse.json({ prescriptions: [] })
    }

    return NextResponse.json({ prescriptions: (prescriptions || []).map(normalizePrescription) })
  } catch (err: any) {
    console.error('[Prescriptions API]:', err)
    return NextResponse.json({ prescriptions: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['doctor', 'hospital_admin'].includes((token as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const patientId = body.patientId || body.patient_id
    if (!patientId) return NextResponse.json({ error: 'Patient required' }, { status: 400 })

    const hospitalId = body.hospitalId || body.hospital_id || (token as any).hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital not linked' }, { status: 400 })

    // Generate unique 6-digit token
    let tokenNumber: string
    let attempts = 0
    while (true) {
      tokenNumber = Math.floor(100000 + Math.random() * 900000).toString()
      const { data: existing } = await supabaseAdmin
        .from('prescriptions')
        .select('id')
        .eq('token_number', tokenNumber)
        .single()
      if (!existing) break
      if (++attempts > 10) break
    }

    const { data: prescription, error } = await supabaseAdmin
      .from('prescriptions')
      .insert({
        token_number: tokenNumber!,
        patient_id: patientId,
        doctor_id: (token as any).id,
        hospital_id: hospitalId,
        diagnosis: body.diagnosis || 'General Consultation',
        symptoms: Array.isArray(body.symptoms) ? body.symptoms : [],
        medicines: Array.isArray(body.medicines) ? body.medicines : [],
        vitals: body.vitals || {},
        notes: body.notes || '',
        follow_up_date: body.followUpDate || body.follow_up_date || null,
        dispensed: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[Prescription Insert Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prescription: normalizePrescription(prescription) }, { status: 201 })
  } catch (err: any) {
    console.error('[Prescriptions POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
