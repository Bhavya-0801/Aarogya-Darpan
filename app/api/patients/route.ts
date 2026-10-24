import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'
import { generateUHID } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function normalizePatient(p: any) {
  if (!p) return null
  const user = p.user || {}
  return {
    ...p,
    _id: p.id,
    name: user.name || p.name || 'Patient',
    email: user.email || p.email || '',
    phone: user.phone || p.phone || '',
    bloodGroup: p.blood_group || '',
    chronicConditions: p.chronic_conditions || [],
    userId: {
      ...user,
      _id: user.id || p.user_id,
    },
    user: {
      ...user,
      _id: user.id || p.user_id,
    },
  }
}

export async function GET(req: NextRequest) {
  try {
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
        .select('*, user:users(id, name, email, phone)')
        .eq('uhid', uhid.trim())
        .single()

      return NextResponse.json({ patient: normalizePatient(patient) })
    }

    let query = supabaseAdmin
      .from('patients')
      .select('*, user:users(id, name, email, phone)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (hospitalId && role !== 'patient') {
      query = query.eq('hospital_id', hospitalId)
    }

    const { data: patients, error } = await query
    if (error) {
      console.error('[Patients GET Error]:', error)
      return NextResponse.json({ patients: [], total: 0 })
    }

    let result = (patients || []).map(normalizePatient)
    if (search) {
      const s = search.toLowerCase()
      result = result.filter((p: any) =>
        p.uhid?.toLowerCase().includes(s) ||
        p.name?.toLowerCase().includes(s) ||
        p.email?.toLowerCase().includes(s) ||
        p.phone?.toLowerCase().includes(s)
      )
    }

    return NextResponse.json({ patients: result, total: result.length })
  } catch (err: any) {
    console.error('[Patients API Error]:', err)
    return NextResponse.json({ patients: [], total: 0 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['hospital_admin', 'receptionist'].includes((token as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, email, phone, dob, gender, bloodGroup, blood_group, allergies, chronicConditions, chronic_conditions } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

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

      if (userErr || !newUser) {
        return NextResponse.json({ error: userErr?.message || 'Failed to create user' }, { status: 500 })
      }
      userId = newUser.id
    }

    // Check if patient profile already exists
    const { data: existingPatient } = await supabaseAdmin
      .from('patients')
      .select('*, user:users(id, name, email, phone)')
      .eq('user_id', userId)
      .single()

    if (existingPatient) {
      return NextResponse.json({ patient: normalizePatient(existingPatient) }, { status: 201 })
    }

    const { data: patient, error: patErr } = await supabaseAdmin
      .from('patients')
      .insert({
        user_id: userId,
        hospital_id: (token as any).hospitalId || null,
        uhid: generateUHID(),
        dob: dob || '2000-01-01',
        gender: gender || 'Other',
        blood_group: bloodGroup || blood_group || null,
        allergies: Array.isArray(allergies) ? allergies : [],
        chronic_conditions: Array.isArray(chronicConditions || chronic_conditions) ? (chronicConditions || chronic_conditions) : [],
      })
      .select('*, user:users(id, name, email, phone)')
      .single()

    if (patErr) return NextResponse.json({ error: patErr.message }, { status: 500 })
    return NextResponse.json({ patient: normalizePatient(patient) }, { status: 201 })
  } catch (err: any) {
    console.error('[Patients POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
