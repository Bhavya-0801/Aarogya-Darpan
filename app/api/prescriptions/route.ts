import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientId = searchParams.get('patientId')
  const role = (token as any).role

  let query = supabaseAdmin
    .from('prescriptions')
    .select(`
      *,
      patient:patients(id, uhid),
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
  } else if (['hospital_admin', 'receptionist'].includes(role)) {
    query = query.eq('hospital_id', (token as any).hospitalId)
  } else if (role === 'pharmacy') {
    const hospitalId = (token as any).hospitalId
    if (hospitalId) query = query.eq('hospital_id', hospitalId)
  }

  const { data: prescriptions, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prescriptions })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['doctor', 'hospital_admin'].includes((token as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  // Generate unique token
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
      ...body,
      token_number: tokenNumber!,
      doctor_id: (token as any).id,
      hospital_id: body.hospital_id || body.hospitalId || (token as any).hospitalId,
      dispensed: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ prescription }, { status: 201 })
}
