import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (token as any).role
  if (!['doctor', 'hospital_admin'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')
  if (!patientId) return NextResponse.json({ error: 'patientId required' }, { status: 400 })

  // If doctor, verify accepted access request
  if (role === 'doctor') {
    const { data: access } = await supabaseAdmin
      .from('access_requests')
      .select('id')
      .eq('doctor_id', (token as any).id)
      .eq('patient_id', patientId)
      .eq('status', 'accepted')
      .single()
    if (!access) return NextResponse.json({ error: 'No accepted access for this patient' }, { status: 403 })
  }

  const [patientRes, prescriptionsRes, labReportsRes] = await Promise.all([
    supabaseAdmin
      .from('patients')
      .select('*, user:users(name, email, phone)')
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

  return NextResponse.json({
    patient: patientRes.data,
    prescriptions: prescriptionsRes.data || [],
    labReports: labReportsRes.data || [],
  })
}
