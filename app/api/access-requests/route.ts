import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizeRequest(r: any) {
  const patient = r.patient || {}
  const doctor = r.doctor || {}
  return {
    ...r,
    _id: r.id,
    patientId: r.patient ? { ...patient, _id: patient.id } : r.patient_id,
    doctorId: r.doctor ? { ...doctor, _id: doctor.id } : r.doctor_id,
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (token as any).role

    let requests: any[] = []
    if (role === 'doctor') {
      const { data } = await supabaseAdmin
        .from('access_requests')
        .select('*, patient:patients(id, uhid, user:users(name, email, phone))')
        .eq('doctor_id', (token as any).id)
        .order('created_at', { ascending: false })
      requests = data || []
    } else if (role === 'patient') {
      const { data } = await supabaseAdmin
        .from('access_requests')
        .select('*, doctor:users!access_requests_doctor_id_fkey(id, name, specialization)')
        .eq('patient_user_id', (token as any).id)
        .order('created_at', { ascending: false })
      requests = data || []
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ requests: requests.map(normalizeRequest) })
  } catch (err: any) {
    console.error('[Access Requests GET Error]:', err)
    return NextResponse.json({ requests: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((token as any).role !== 'doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { patientId, patientUhid } = await req.json()

    let patient: any
    if (patientId) {
      const { data } = await supabaseAdmin.from('patients').select('*, user_id').eq('id', patientId).single()
      patient = data
    } else if (patientUhid) {
      const { data } = await supabaseAdmin.from('patients').select('*, user_id').eq('uhid', patientUhid).single()
      patient = data
    }

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Check existing pending request
    const { data: existing } = await supabaseAdmin
      .from('access_requests')
      .select('id')
      .eq('doctor_id', (token as any).id)
      .eq('patient_id', patient.id)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) return NextResponse.json({ error: 'Access request already sent' }, { status: 409 })

    const { data: doctorUser } = await supabaseAdmin
      .from('users')
      .select('name, hospital_id')
      .eq('id', (token as any).id)
      .single()

    let hospitalName = ''
    if (doctorUser?.hospital_id) {
      const { data: hospital } = await supabaseAdmin
        .from('hospitals')
        .select('name')
        .eq('id', doctorUser.hospital_id)
        .single()
      hospitalName = hospital?.name || ''
    }

    const { data: request, error } = await supabaseAdmin
      .from('access_requests')
      .insert({
        doctor_id: (token as any).id,
        doctor_name: doctorUser?.name || 'Doctor',
        hospital_name: hospitalName,
        patient_id: patient.id,
        patient_user_id: patient.user_id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: patient.user_id,
        type: 'access_request',
        title: 'Medical History Access Request',
        message: `Dr. ${doctorUser?.name} from ${hospitalName || 'a hospital'} is requesting access to your medical history.`,
        data: { accessRequestId: request.id, doctorName: doctorUser?.name },
        actionable: true,
      })
    } catch {}

    return NextResponse.json({ request: normalizeRequest(request) }, { status: 201 })
  } catch (err: any) {
    console.error('[Access Requests POST Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((token as any).role !== 'patient') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    const requestId = body.requestId || body.id || body._id
    const action = body.action

    const { data: request, error } = await supabaseAdmin
      .from('access_requests')
      .update({ status: action, responded_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('patient_user_id', (token as any).id)
      .select()
      .single()

    if (error || !request) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: request.doctor_id,
        type: 'access_request',
        title: action === 'accepted' ? 'Access Request Accepted' : 'Access Request Denied',
        message: `The patient has ${action} your request to access their medical history.`,
        data: { patientId: request.patient_id },
        actionable: false,
      })
    } catch {}

    return NextResponse.json({ request: normalizeRequest(request) })
  } catch (err: any) {
    console.error('[Access Requests PATCH Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((token as any).role !== 'doctor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json().catch(() => ({}))
    const { searchParams } = new URL(req.url)
    const requestId = body.requestId || body.id || body._id || searchParams.get('id')

    if (!requestId) return NextResponse.json({ error: 'requestId required' }, { status: 400 })

    const { error } = await supabaseAdmin
      .from('access_requests')
      .delete()
      .eq('id', requestId)
      .eq('doctor_id', (token as any).id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Access Requests DELETE Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
