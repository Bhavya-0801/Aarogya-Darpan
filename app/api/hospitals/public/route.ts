import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const hospitalId = searchParams.get('hospitalId')

    if (hospitalId) {
      const { data: doctors } = await supabaseAdmin
        .from('users')
        .select('id, name, specialization, opd_fee, department')
        .eq('hospital_id', hospitalId)
        .eq('role', 'doctor')
        .eq('is_active', true)

      return NextResponse.json({ doctors })
    }

    const { data: hospitals } = await supabaseAdmin
      .from('hospitals')
      .select('id, name, city, state, phone')

    return NextResponse.json({ hospitals: hospitals || [] })
  } catch (err) {
    console.error('[Hospitals Public API]', err)
    return NextResponse.json({ hospitals: [] })
  }
}
