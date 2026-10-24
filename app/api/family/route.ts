import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', (token as any).id)
    .single()

  if (!patient) return NextResponse.json({ members: [] })

  const { data: members, error } = await supabaseAdmin
    .from('family_members')
    .select('*')
    .eq('primary_patient_id', patient.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ members })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: patient } = await supabaseAdmin
    .from('patients')
    .select('id')
    .eq('user_id', (token as any).id)
    .single()

  if (!patient) return NextResponse.json({ error: 'Patient profile not found' }, { status: 404 })

  const body = await req.json()
  const { data: member, error } = await supabaseAdmin
    .from('family_members')
    .insert({ ...body, primary_patient_id: patient.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

  const { error } = await supabaseAdmin.from('family_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
