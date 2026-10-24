import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['hospital_admin', 'doctor', 'receptionist'].includes((token as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const hospitalId = (token as any).hospitalId
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  let query = supabaseAdmin
    .from('users')
    .select('id, name, email, phone, role, specialization, department, opd_fee, created_at')
    .eq('hospital_id', hospitalId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (role) {
    query = query.eq('role', role)
  } else {
    query = query.in('role', ['doctor', 'receptionist', 'lab_technician'])
  }

  const { data: staff, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((token as any).role !== 'hospital_admin') {
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, password, role, phone, specialization, department, opdFee } = body

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(password, 12)

  const { data: staff, error } = await supabaseAdmin
    .from('users')
    .insert({
      name,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      role,
      phone: phone || '',
      hospital_id: (token as any).hospitalId,
      specialization: specialization || '',
      department: department || '',
      opd_fee: opdFee || 300,
    })
    .select('id, name, email, role')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ staff }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((token as any).role !== 'hospital_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('users').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
