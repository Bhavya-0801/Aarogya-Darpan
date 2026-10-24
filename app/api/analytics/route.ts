import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const EMPTY = {
  hospital: null,
  stats: { totalPatients: 0, pendingLabs: 0, totalPrescriptions: 0, todayRevenue: 0, todayAppointments: 0, totalBeds: 0 },
  weeklyTrend: [],
  appointmentsByType: [],
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (token as any).role
    const userId = (token as any).id

    if (!['hospital_admin', 'doctor', 'receptionist', 'lab_technician', 'pharmacy'].includes(role)) {
      return NextResponse.json(EMPTY)
    }

    let hospitalId: string | null = (token as any).hospitalId || null

    if (!hospitalId && role === 'hospital_admin') {
      const { data: h } = await supabaseAdmin
        .from('hospitals')
        .select('id')
        .eq('admin_id', userId)
        .single()
      if (h) hospitalId = h.id
    }

    if (!hospitalId) return NextResponse.json(EMPTY)

    // Fetch hospital info
    const { data: hospital } = await supabaseAdmin
      .from('hospitals')
      .select('id, name, city, state, phone, email, license_number, departments, total_beds')
      .eq('id', hospitalId)
      .single()

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Run all counts in parallel
    const [
      patientsRes,
      labsRes,
      prescriptionsRes,
      todayBillsRes,
      todayApptRes,
      bedsRes,
      weeklyApptRes,
      apptTypeRes,
    ] = await Promise.all([
      supabaseAdmin.from('patients').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId),
      supabaseAdmin.from('lab_reports').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).eq('status', 'pending'),
      supabaseAdmin.from('prescriptions').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId),
      supabaseAdmin.from('bills').select('paid_amount').eq('hospital_id', hospitalId).gte('created_at', todayStart.toISOString()),
      supabaseAdmin.from('appointments').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId).gte('scheduled_at', todayStart.toISOString()).lte('scheduled_at', todayEnd.toISOString()),
      supabaseAdmin.from('beds').select('id', { count: 'exact', head: true }).eq('hospital_id', hospitalId),
      supabaseAdmin.from('appointments').select('scheduled_at').eq('hospital_id', hospitalId).gte('scheduled_at', weekAgo.toISOString()),
      supabaseAdmin.from('appointments').select('type').eq('hospital_id', hospitalId),
    ])

    const todayRevenue = (todayBillsRes.data || []).reduce((s: number, b: any) => s + (Number(b.paid_amount) || 0), 0)

    // Build weekly trend (group by day-of-week)
    const dayMap: Record<string, number> = {}
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    (weeklyApptRes.data || []).forEach((a: any) => {
      const d = dayNames[new Date(a.scheduled_at).getDay()]
      dayMap[d] = (dayMap[d] || 0) + 1
    })
    const weeklyTrend = Object.entries(dayMap).map(([_id, count]) => ({ _id, count }))

    // Build appointments by type
    const typeMap: Record<string, number> = {};
    (apptTypeRes.data || []).forEach((a: any) => {
      typeMap[a.type] = (typeMap[a.type] || 0) + 1
    })
    const appointmentsByType = Object.entries(typeMap).map(([_id, count]) => ({ _id, count }))

    return NextResponse.json({
      hospital: hospital ? {
        ...hospital,
        _id: hospital.id,
        name: hospital.name,
        hospitalId,
        city: hospital.city,
        state: hospital.state,
        phone: hospital.phone,
        email: hospital.email,
        licenseNumber: hospital.license_number,
        departments: hospital.departments || [],
        totalBeds: hospital.total_beds || 0,
      } : null,
      stats: {
        totalPatients: patientsRes.count || 0,
        pendingLabs: labsRes.count || 0,
        totalPrescriptions: prescriptionsRes.count || 0,
        todayRevenue,
        todayAppointments: todayApptRes.count || 0,
        totalBeds: bedsRes.count || 0,
      },
      weeklyTrend,
      appointmentsByType,
    })
  } catch (err: any) {
    console.error('[Analytics API Error]', err)
    return NextResponse.json(EMPTY)
  }
}
