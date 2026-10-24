import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizeHospital(h: any) {
  if (!h) return null
  return {
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
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((token as any).role !== 'hospital_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const userId = (token as any).id
    const hospitalId = (token as any).hospitalId

    let hospital = null
    const { data: byAdmin } = await supabaseAdmin
      .from('hospitals')
      .select('*')
      .eq('admin_id', userId)
      .maybeSingle()

    if (byAdmin) {
      hospital = byAdmin
    } else if (hospitalId) {
      const { data: byId } = await supabaseAdmin
        .from('hospitals')
        .select('*')
        .eq('id', hospitalId)
        .maybeSingle()
      if (byId) hospital = byId
    }

    return NextResponse.json({ hospital: normalizeHospital(hospital) })
  } catch (err: any) {
    console.error('[Settings GET error]:', err)
    return NextResponse.json({ hospital: null })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((token as any).role !== 'hospital_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const {
      hospitalName, hospitalCity, hospitalState, hospitalStreet,
      hospitalPincode, hospitalPhone, hospitalEmail, licenseNumber,
      departments, totalBeds, website,
    } = body

    const updates: Record<string, any> = {}
    if (hospitalName) updates.name = hospitalName
    if (hospitalStreet !== undefined) updates.street = hospitalStreet
    if (hospitalCity !== undefined) updates.city = hospitalCity
    if (hospitalState !== undefined) updates.state = hospitalState
    if (hospitalPincode !== undefined) updates.pincode = hospitalPincode
    if (hospitalPhone) updates.phone = hospitalPhone
    if (hospitalEmail) updates.email = hospitalEmail
    if (licenseNumber !== undefined) updates.license_number = licenseNumber
    if (departments !== undefined) updates.departments = departments
    if (totalBeds !== undefined) updates.total_beds = Number(totalBeds)
    if (website !== undefined) updates.website = website

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ message: 'No changes to save' })
    }

    const userId = (token as any).id
    const hospitalId = (token as any).hospitalId

    let updateQuery = supabaseAdmin.from('hospitals').update(updates)
    if (hospitalId) {
      updateQuery = updateQuery.eq('id', hospitalId)
    } else {
      updateQuery = updateQuery.eq('admin_id', userId)
    }

    const { data: hospital, error } = await updateQuery.select().single()

    if (error || !hospital) return NextResponse.json({ error: 'Hospital not found. Please complete initial setup.' }, { status: 404 })
    return NextResponse.json({ hospital: normalizeHospital(hospital), message: 'Settings saved successfully' })
  } catch (err: any) {
    console.error('[Settings PATCH error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
