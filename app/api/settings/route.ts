import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((token as any).role !== 'hospital_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: hospital } = await supabaseAdmin
    .from('hospitals')
    .select('*')
    .eq('admin_id', (token as any).id)
    .single()

  return NextResponse.json({ hospital })
}

export async function PATCH(req: NextRequest) {
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

  const { data: hospital, error } = await supabaseAdmin
    .from('hospitals')
    .update(updates)
    .eq('admin_id', (token as any).id)
    .select()
    .single()

  if (error || !hospital) return NextResponse.json({ error: 'Hospital not found. Please complete initial setup.' }, { status: 404 })
  return NextResponse.json({ hospital, message: 'Settings saved successfully' })
}
