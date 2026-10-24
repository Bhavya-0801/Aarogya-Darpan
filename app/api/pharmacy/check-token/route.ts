import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const tokenNumber = new URL(req.url).searchParams.get('token')
  if (!tokenNumber) return NextResponse.json({ error: 'Token number required' }, { status: 400 })

  const { data: prescription, error } = await supabaseAdmin
    .from('prescriptions')
    .select(`
      *,
      patient:patients(id, uhid),
      doctor:users!prescriptions_doctor_id_fkey(id, name, specialization),
      hospital:hospitals(id, name)
    `)
    .eq('token_number', tokenNumber.trim())
    .single()

  if (error || !prescription) return NextResponse.json({ error: 'No prescription found for this token' }, { status: 404 })
  return NextResponse.json({ prescription })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((token as any).role !== 'pharmacy') {
    return NextResponse.json({ error: 'Forbidden - pharmacy only' }, { status: 403 })
  }

  const { tokenNumber } = await req.json()
  if (!tokenNumber) return NextResponse.json({ error: 'Token number required' }, { status: 400 })

  const { data: prescription, error } = await supabaseAdmin
    .from('prescriptions')
    .update({
      dispensed: true,
      dispensed_at: new Date().toISOString(),
      dispensed_by: (token as any).id,
    })
    .eq('token_number', tokenNumber.trim())
    .select()
    .single()

  if (error || !prescription) return NextResponse.json({ error: 'Prescription not found' }, { status: 404 })
  return NextResponse.json({ prescription, message: 'Prescription marked as dispensed' })
}
