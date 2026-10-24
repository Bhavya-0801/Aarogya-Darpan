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
    // Auto-create patient record if missing so user is never locked out
    const uhid = generateUHID()
    const { data: newPatient, error } = await supabaseAdmin
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

    if (!error && newPatient) {
      patient = newPatient
    }
  }

  return patient
}

function normalizeMember(m: any) {
  return {
    ...m,
    _id: m.id,
    bloodGroup: m.blood_group || '',
    chronicConditions: m.chronic_conditions || [],
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (token as any).id
    const patient = await getOrCreatePatient(userId)
    if (!patient) return NextResponse.json({ members: [] })

    const { data: members, error } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('primary_patient_id', patient.id)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ members: (members || []).map(normalizeMember) })
  } catch (err: any) {
    console.error('[Family GET Error]:', err)
    return NextResponse.json({ members: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = (token as any).id
    const patient = await getOrCreatePatient(userId)
    if (!patient) return NextResponse.json({ error: 'Patient profile could not be created' }, { status: 404 })

    const body = await req.json()
    const { name, relation, dob, gender, bloodGroup, blood_group, phone, allergies, chronicConditions, chronic_conditions } = body

    if (!name || !relation) {
      return NextResponse.json({ error: 'Name and relation are required' }, { status: 400 })
    }

    const payload = {
      primary_patient_id: patient.id,
      name: String(name).trim(),
      relation: String(relation).trim(),
      dob: dob || null,
      gender: gender || 'Other',
      blood_group: bloodGroup || blood_group || null,
      phone: phone || null,
      allergies: Array.isArray(allergies) ? allergies : [],
      chronic_conditions: Array.isArray(chronicConditions || chronic_conditions)
        ? (chronicConditions || chronic_conditions)
        : [],
    }

    const { data: member, error } = await supabaseAdmin
      .from('family_members')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('[Family Insert Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ member: normalizeMember(member) }, { status: 201 })
  } catch (err: any) {
    console.error('[Family POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('family_members').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Family DELETE Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
