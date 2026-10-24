import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

function generateBillNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `INV${year}${month}${random}`
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const patientIdParam = searchParams.get('patientId')
  const status = searchParams.get('status')
  const role = (token as any).role

  let query = supabaseAdmin
    .from('bills')
    .select('*, patient:patients(id, uhid), created_by_user:users!bills_created_by_fkey(id, name)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (role === 'patient') {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', (token as any).id)
      .single()
    if (!patient) return NextResponse.json({ bills: [] })
    query = query.eq('patient_id', patient.id)
  } else {
    query = query.eq('hospital_id', (token as any).hospitalId)
    if (patientIdParam) query = query.eq('patient_id', patientIdParam)
    if (status) query = query.eq('status', status)
  }

  const { data: bills, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bills })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['hospital_admin', 'receptionist'].includes((token as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()

  const { data: bill, error } = await supabaseAdmin
    .from('bills')
    .insert({
      ...body,
      bill_number: generateBillNumber(),
      hospital_id: (token as any).hospitalId,
      created_by: (token as any).id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bill }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  const { data: bill, error } = await supabaseAdmin
    .from('bills')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bill })
}
