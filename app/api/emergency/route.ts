import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'active'
  const hospitalId = (token as any).hospitalId

  let query = supabaseAdmin
    .from('emergency_registrations')
    .select('*')
    .order('admitted_at', { ascending: false })

  if (hospitalId) query = query.eq('hospital_id', hospitalId)
  if (status && status !== 'all') query = query.eq('status', status)

  const { data: registrations, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    registrations: (registrations || []).map((r: any) => ({
      ...r,
      _id: r.id,
      patientName: r.patient_name,
      tempId: r.temp_id,
      chiefComplaint: r.chief_complaint,
      bedNumber: r.bed_number,
    }))
  })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['receptionist', 'hospital_admin'].includes((token as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const tempId = `TEMP-${Date.now().toString(36).toUpperCase()}`

  const { data: registration, error } = await supabaseAdmin
    .from('emergency_registrations')
    .insert({
      ...body,
      temp_id: tempId,
      hospital_id: (token as any).hospitalId,
      created_by: (token as any).id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ registration }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  const { data: registration, error } = await supabaseAdmin
    .from('emergency_registrations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ registration })
}
