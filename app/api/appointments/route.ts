import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUHID } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getOrCreatePatient(userId: string) {
  let { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!patient) {
    const uhid = generateUHID()
    const { data: newPatient } = await supabaseAdmin
      .from('patients')
      .insert({
        user_id: userId,
        uhid,
        dob: '2000-01-01',
        gender: 'Other',
        allergies: [],
        chronic_conditions: [],
      })
      .select('id')
      .single()

    if (newPatient) patient = newPatient
  }
  return patient
}

function normalizeAppointment(a: any) {
  const patientUser = a.patient?.user || {}
  const doctor = a.doctor || {}
  const hospital = a.hospital || {}

  return {
    ...a,
    _id: a.id,
    scheduledAt: a.scheduled_at,
    chiefComplaint: a.chief_complaint,
    patientName: patientUser.name || 'Patient',
    patientUhid: a.patient?.uhid || '',
    doctorName: doctor.name || 'Doctor',
    doctorSpecialization: doctor.specialization || '',
    hospitalName: hospital.name || 'Hospital',
    patient: a.patient ? { ...a.patient, _id: a.patient.id, userId: patientUser } : null,
    doctor: a.doctor ? { ...doctor, _id: doctor.id } : null,
    hospital: a.hospital ? { ...hospital, _id: hospital.id } : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const role = (token as any).role
    const hospitalId = (token as any).hospitalId

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:patients(id, uhid, user:users(id, name, email, phone)),
        doctor:users!appointments_doctor_id_fkey(id, name, specialization),
        hospital:hospitals(id, name, city, state)
      `)
      .order('scheduled_at', { ascending: false })
      .limit(200)

    if (role === 'patient') {
      const patient = await getOrCreatePatient((token as any).id)
      if (!patient) return NextResponse.json({ appointments: [], total: 0 })
      query = query.eq('patient_id', patient.id)
    } else if (role === 'doctor') {
      query = query.eq('doctor_id', (token as any).id)
    } else if (['hospital_admin', 'receptionist'].includes(role)) {
      if (hospitalId) {
        query = query.eq('hospital_id', hospitalId)
      }
    }

    const status = searchParams.get('status')
    if (status && status !== 'all') query = query.eq('status', status)

    const today = searchParams.get('today')
    if (today) {
      const start = new Date(); start.setHours(0, 0, 0, 0)
      const end = new Date(); end.setHours(23, 59, 59, 999)
      query = query.gte('scheduled_at', start.toISOString()).lte('scheduled_at', end.toISOString())
    }

    const { data: appointments, error } = await query
    if (error) {
      console.error('[Appointments GET error]:', error)
      return NextResponse.json({ appointments: [], total: 0 })
    }

    const normalized = (appointments || []).map(normalizeAppointment)
    return NextResponse.json({ appointments: normalized, total: normalized.length })
  } catch (err: any) {
    console.error('[Appointments API]:', err)
    return NextResponse.json({ appointments: [], total: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const role = (token as any).role

    let patientId = body.patientId || body.patient_id
    if (role === 'patient' || !patientId) {
      const patient = await getOrCreatePatient((token as any).id)
      if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
      patientId = patient.id
    }

    const hospitalId = body.hospitalId || body.hospital_id
    const doctorId = body.doctorId || body.doctor_id
    const scheduledAt = body.scheduledAt || body.scheduled_at || new Date().toISOString()
    const chiefComplaint = body.chiefComplaint || body.chief_complaint || ''
    const type = body.type || 'OPD'
    const createdBy = body.createdBy || body.created_by || (token as any).id

    if (!hospitalId || !doctorId) {
      return NextResponse.json({ error: 'Hospital and Doctor are required' }, { status: 400 })
    }

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        hospital_id: hospitalId,
        scheduled_at: scheduledAt,
        type,
        status: 'scheduled',
        chief_complaint: chiefComplaint,
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) {
      console.error('[Appointment insert error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Notify doctor
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: doctorId,
        type: 'appointment',
        title: 'New Appointment Scheduled',
        message: 'A patient has booked an OPD appointment with you.',
        data: { appointmentId: appointment.id },
        actionable: false,
      })
    } catch {}

    return NextResponse.json({ appointment: normalizeAppointment(appointment) }, { status: 201 })
  } catch (err: any) {
    console.error('[Appointments POST error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const id = body.id || body._id
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const updates: any = {}
    if (body.status) updates.status = body.status
    if (body.chiefComplaint || body.chief_complaint) updates.chief_complaint = body.chiefComplaint || body.chief_complaint
    if (body.scheduledAt || body.scheduled_at) updates.scheduled_at = body.scheduledAt || body.scheduled_at

    const { data: appointment, error } = await supabaseAdmin
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ appointment: normalizeAppointment(appointment) })
  } catch (err: any) {
    console.error('[Appointments PATCH error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
