import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = (token as any).role

  if (role !== 'patient') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, email, phone, role, specialization, department, opd_fee, hospital_id')
      .eq('id', (token as any).id)
      .single()
    return NextResponse.json({ profile: null, user })
  }

  const { data: patient, error } = await supabaseAdmin
    .from('patients')
    .select('*, user:users(id, name, email, phone, profile_image, role)')
    .eq('user_id', (token as any).id)
    .single()

  if (error || !patient) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  return NextResponse.json({ profile: patient })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, phone, allergies, chronicConditions, emergencyContact, bloodGroup, address } = body

  if (name || phone) {
    await supabaseAdmin
      .from('users')
      .update({ ...(name && { name }), ...(phone && { phone }) })
      .eq('id', (token as any).id)
  }

  const role = (token as any).role
  if (role !== 'patient') {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name, email, phone, role, specialization, department, opd_fee, hospital_id')
      .eq('id', (token as any).id)
      .single()
    return NextResponse.json({ profile: null, user })
  }

  const updateFields: any = {}
  if (allergies !== undefined) updateFields.allergies = allergies
  if (chronicConditions !== undefined) updateFields.chronic_conditions = chronicConditions
  if (bloodGroup !== undefined) updateFields.blood_group = bloodGroup
  if (address !== undefined) updateFields.address = address
  if (emergencyContact !== undefined) {
    updateFields.emergency_name = emergencyContact.name
    updateFields.emergency_relation = emergencyContact.relation
    updateFields.emergency_phone = emergencyContact.phone
  }

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .update(updateFields)
    .eq('user_id', (token as any).id)
    .select('*, user:users(id, name, email, phone)')
    .single()

  return NextResponse.json({ profile: patient })
}
