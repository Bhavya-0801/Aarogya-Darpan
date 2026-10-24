import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUHID } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const uhid = searchParams.get('uhid') || ''
  const role = (token as any).role
  const hospitalId = (token as any).hospitalId

  // UHID lookup
  if (uhid) {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('*, user:users(name, email, phone)')
      .eq('uhid', uhid.trim())
      .single()
    return NextResponse.json({ patient })
  }

  let query = supabaseAdmin
    .from('patients')
    .select('*, user:users(name, email, phone)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (hospitalId && role !== 'patient') {
    query = query.eq('hospital_id', hospitalId)
  }

  const { data: patients, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let result = patients || []
  if (search) {
    const s = search.toLowerCase()
    result = result.filter((p: any) =>
      p.uhid?.toLowerCase().includes(s) ||
      (p.user as any)?.name?.toLowerCase().includes(s) ||
      (p.user as any)?.email?.toLowerCase().includes(s)
    )
  }

  return NextResponse.json({ patients: result, total: result.length })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['hospital_admin', 'receptionist'].includes((token as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, phone, dob, gender, bloodGroup, allergies, chronicConditions } = body

  // Check if user exists by email
  let userId: string
  const { data: existingUser } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingUser) {
    userId = existingUser.id
  } else {
    const { data: newUser, error: userErr } = await supabaseAdmin
      .from('users')
      .insert({
        name,
        email: email.toLowerCase(),
        password_hash: `temp_${Date.now()}`,
        role: 'patient',
        phone: phone || '',
        hospital_id: (token as any).hospitalId || null,
      })
      .select()
      .single()
    if (userErr || !newUser) return NextResponse.json({ error: userErr?.message || 'Failed to create user' }, { status: 500 })
    userId = newUser.id
  }

  // Check if patient profile already exists
  const { data: existingPatient } = await supabaseAdmin
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (existingPatient) {
    return NextResponse.json({ patient: existingPatient }, { status: 201 })
  }

  const { data: patient, error: patErr } = await supabaseAdmin
    .from('patients')
    .insert({
      user_id: userId,
      hospital_id: (token as any).hospitalId || null,
      uhid: generateUHID(),
      dob,
      gender,
      blood_group: bloodGroup || null,
      allergies: allergies || [],
      chronic_conditions: chronicConditions || [],
    })
    .select()
    .single()

  if (patErr) return NextResponse.json({ error: patErr.message }, { status: 500 })
  return NextResponse.json({ patient }, { status: 201 })
}
