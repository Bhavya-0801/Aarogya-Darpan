import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = (token as any).role
  const hospitalId = (token as any).hospitalId

  let query = supabaseAdmin
    .from('appointments')
    .select(`
      *,
      patient:patients(id, uhid),
      doctor:users!appointments_doctor_id_fkey(id, name, specialization),
      hospital:hospitals(id, name)
    `)
    .order('scheduled_at', { ascending: false })
    .limit(200)

  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', (token as any).id)
      .single()
    if (!patient) return NextResponse.json({ appointments: [], total: 0 })
    query = query.eq('patient_id', patient.id)
  } else if (role === 'doctor') {
    query = query.eq('doctor_id', (token as any).id)
  } else if (['hospital_admin', 'receptionist'].includes(role)) {
    if (!hospitalId) return NextResponse.json({ appointments: [], total: 0 })
    query = query.eq('hospital_id', hospitalId)
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ appointments, total: appointments?.length || 0 })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const role = (token as any).role

  let patientId = body.patientId
  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', (token as any).id)
      .single()
    if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })
    patientId = patient.id
  }

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .insert({ ...body, patient_id: patientId, status: 'scheduled' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify doctor
  if (body.doctorId || body.doctor_id) {
    const doctorId = body.doctor_id || body.doctorId
    await supabaseAdmin.from('notifications').insert({
      user_id: doctorId,
      type: 'appointment',
      title: 'New Appointment Scheduled',
      message: 'A patient has booked an OPD appointment with you.',
      data: { appointmentId: appointment.id },
      actionable: false,
    })
  }

  return NextResponse.json({ appointment }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointment })
}
