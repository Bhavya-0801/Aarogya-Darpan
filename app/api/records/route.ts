import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (token as any).role
    if (!['doctor', 'hospital_admin', 'patient'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    let patientId = searchParams.get('patientId')

    if (role === 'patient') {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('user_id', (token as any).id)
        .single()
      if (!patient) return NextResponse.json({ patient: null, prescriptions: [], labReports: [] })
      patientId = patient.id
    }

    if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })

    // If doctor, verify accepted access request (or same hospital)
    if (role === 'doctor') {
      const { data: access } = await supabaseAdmin
        .from('access_requests')
        .select('id')
        .eq('doctor_id', (token as any).id)
        .eq('patient_id', patientId)
        .eq('status', 'accepted')
        .maybeSingle()

      // Also allow if doctor belongs to the hospital where patient is admitted
      if (!access) {
        const { data: patientCheck } = await supabaseAdmin
          .from('patients')
          .select('hospital_id')
          .eq('id', patientId)
          .single()

        const doctorHospitalId = (token as any).hospitalId
        if (!doctorHospitalId || patientCheck?.hospital_id !== doctorHospitalId) {
          return NextResponse.json({ error: 'No approved access request for this patient' }, { status: 403 })
        }
      }
    }

    const [patientRes, prescriptionsRes, labReportsRes] = await Promise.all([
      supabaseAdmin
        .from('patients')
        .select('*, user:users(id, name, email, phone)')
        .eq('id', patientId)
        .single(),
      supabaseAdmin
        .from('prescriptions')
        .select('*, doctor:users!prescriptions_doctor_id_fkey(id, name, specialization)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('lab_reports')
        .select('*, requested_by_user:users!lab_reports_requested_by_fkey(id, name)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }),
    ])

    const patientData = patientRes.data ? { ...patientRes.data, _id: patientRes.data.id } : null
    const prescriptions = (prescriptionsRes.data || []).map((p: any) => ({
      ...p,
      _id: p.id,
      tokenNumber: p.token_number,
      doctorName: p.doctor?.name || 'Doctor',
    }))
    const labReports = (labReportsRes.data || []).map((r: any) => ({
      ...r,
      _id: r.id,
      testName: r.tests?.[0]?.name || 'Lab Test',
      result: r.tests?.[0]?.result || '',
    }))

    return NextResponse.json({
      patient: patientData,
      prescriptions,
      labReports,
    })
  } catch (err: any) {
    console.error('[Records API Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
