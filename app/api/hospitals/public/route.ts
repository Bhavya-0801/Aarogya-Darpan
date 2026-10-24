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

      return NextResponse.json({
        doctors: (doctors || []).map((d: any) => ({
          ...d,
          _id: d.id,
          opdFee: d.opd_fee,
        })),
      })
    }

    const { data: hospitals } = await supabaseAdmin
      .from('hospitals')
      .select('id, name, street, city, state, pincode, phone, email, license_number, total_beds')

    return NextResponse.json({
      hospitals: (hospitals || []).map((h: any) => ({
        ...h,
        _id: h.id,
        licenseNumber: h.license_number,
        totalBeds: h.total_beds,
        address: {
          street: h.street || '',
          city: h.city || '',
          state: h.state || '',
          pincode: h.pincode || '',
        },
      })),
    })
  } catch (err) {
    console.error('[Hospitals Public API]', err)
    return NextResponse.json({ hospitals: [], doctors: [] })
  }
}
