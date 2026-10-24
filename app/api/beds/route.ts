import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizeBed(b: any) {
  return {
    ...b,
    _id: b.id,
    bedNumber: b.bed_number,
    dailyRate: b.daily_rate || 0,
    currentPatient: b.patient ? { ...b.patient, _id: b.patient.id } : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const hospitalId = (token as any).hospitalId
    if (!hospitalId) return NextResponse.json({ beds: [] })

    const { data: beds, error } = await supabaseAdmin
      .from('beds')
      .select('*, patient:patients(id, uhid, user:users(name))')
      .eq('hospital_id', hospitalId)
      .order('ward', { ascending: true })
      .order('bed_number', { ascending: true })

    if (error) {
      console.error('[Beds GET Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ beds: (beds || []).map(normalizeBed) })
  } catch (err: any) {
    console.error('[Beds API]:', err)
    return NextResponse.json({ beds: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((token as any).role !== 'hospital_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const hospitalId = (token as any).hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital not found' }, { status: 400 })

    const body = await req.json()
    const bedNumber = body.bedNumber || body.bed_number
    const ward = body.ward
    const type = body.type || 'general'
    const dailyRate = Number(body.dailyRate || body.daily_rate) || 0
    const notes = body.notes || ''

    if (!bedNumber || !ward) {
      return NextResponse.json({ error: 'Bed number and ward are required' }, { status: 400 })
    }

    const { data: bed, error } = await supabaseAdmin
      .from('beds')
      .insert({
        bed_number: String(bedNumber).trim(),
        ward: String(ward).trim(),
        type,
        status: 'available',
        hospital_id: hospitalId,
        daily_rate: dailyRate,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bed Insert Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bed: normalizeBed(bed) }, { status: 201 })
  } catch (err: any) {
    console.error('[Beds POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const id = body.id || body._id
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const updates: any = {}
    if (body.status) updates.status = body.status
    if (body.ward) updates.ward = body.ward
    if (body.bedNumber || body.bed_number) updates.bed_number = body.bedNumber || body.bed_number
    if (body.dailyRate !== undefined || body.daily_rate !== undefined) updates.daily_rate = Number(body.dailyRate || body.daily_rate) || 0
    if (body.currentPatientId !== undefined || body.current_patient_id !== undefined) {
      updates.current_patient_id = body.currentPatientId || body.current_patient_id || null
    }

    const { data: bed, error } = await supabaseAdmin
      .from('beds')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bed: normalizeBed(bed) })
  } catch (err: any) {
    console.error('[Beds PATCH Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((token as any).role !== 'hospital_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('beds').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Beds DELETE Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
