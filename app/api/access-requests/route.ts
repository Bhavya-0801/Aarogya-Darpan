import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (token as any).role

  let requests: any[] = []
  if (role === 'doctor') {
    const { data } = await supabaseAdmin
      .from('access_requests')
      .select('*, patient:patients(id, uhid)')
      .eq('doctor_id', (token as any).id)
      .order('created_at', { ascending: false })
    requests = data || []
  } else if (role === 'patient') {
    const { data } = await supabaseAdmin
      .from('access_requests')
      .select('*, doctor:users!access_requests_doctor_id_fkey(id, name, specialization)')
      .eq('patient_user_id', (token as any).id)
      .order('created_at', { ascending: false })
    requests = data || []
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ requests })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((token as any).role !== 'doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { patientId, patientUhid } = await req.json()

  let patient: any
  if (patientId) {
    const { data } = await supabaseAdmin.from('patients').select('*, user_id').eq('id', patientId).single()
    patient = data
  } else if (patientUhid) {
    const { data } = await supabaseAdmin.from('patients').select('*, user_id').eq('uhid', patientUhid).single()
    patient = data
  }

  if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

  // Check existing pending request
  const { data: existing } = await supabaseAdmin
    .from('access_requests')
    .select('id')
    .eq('doctor_id', (token as any).id)
    .eq('patient_id', patient.id)
    .eq('status', 'pending')
    .single()

  if (existing) return NextResponse.json({ error: 'Access request already sent' }, { status: 409 })

  const { data: doctorUser } = await supabaseAdmin
    .from('users')
    .select('name, hospital_id')
    .eq('id', (token as any).id)
    .single()

  let hospitalName = ''
  if (doctorUser?.hospital_id) {
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('name')
      .eq('id', doctorUser.hospital_id)
      .single()
    hospitalName = hospital?.name || ''
  }

  const { data: request, error } = await supabaseAdmin
    .from('access_requests')
    .insert({
      doctor_id: (token as any).id,
      doctor_name: doctorUser?.name || 'Doctor',
      hospital_name: hospitalName,
      patient_id: patient.id,
      patient_user_id: patient.user_id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin.from('notifications').insert({
    user_id: patient.user_id,
    type: 'access_request',
    title: 'Medical History Access Request',
    message: `Dr. ${doctorUser?.name} from ${hospitalName || 'a hospital'} is requesting access to your medical history.`,
    data: { accessRequestId: request.id, doctorName: doctorUser?.name },
    actionable: true,
  })

  return NextResponse.json({ request }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((token as any).role !== 'patient') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { requestId, action } = await req.json()

  const { data: request, error } = await supabaseAdmin
    .from('access_requests')
    .update({ status: action, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('patient_user_id', (token as any).id)
    .select()
    .single()

  if (error || !request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  await supabaseAdmin.from('notifications').insert({
    user_id: request.doctor_id,
    type: 'access_request',
    title: action === 'accepted' ? 'Access Request Accepted' : 'Access Request Denied',
    message: `The patient has ${action} your request to access their medical history.`,
    data: { patientId: request.patient_id },
    actionable: false,
  })

  return NextResponse.json({ request })
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((token as any).role !== 'doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { requestId } = await req.json()
  const { error } = await supabaseAdmin
    .from('access_requests')
    .delete()
    .eq('id', requestId)
    .eq('doctor_id', (token as any).id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
