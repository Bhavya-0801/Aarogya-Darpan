import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const role = (token as any).role
  const patientId = searchParams.get('patientId')

  let query = supabaseAdmin
    .from('lab_reports')
    .select(`
      *,
      patient:patients(id, uhid),
      requested_by_user:users!lab_reports_requested_by_fkey(id, name),
      processed_by_user:users!lab_reports_processed_by_fkey(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (patientId) {
    query = query.eq('patient_id', patientId)
  } else if (role === 'patient') {
    const { data: patient } = await supabaseAdmin
      .from('patients')
      .select('id')
      .eq('user_id', (token as any).id)
      .single()
    if (!patient) return NextResponse.json({ reports: [] })
    query = query.eq('patient_id', patient.id)
  } else {
    query = query.eq('hospital_id', (token as any).hospitalId)
  }

  const { data: reports, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const mapped = (reports || []).map((r: any) => ({
    ...r,
    testName: r.tests?.[0]?.name || 'Lab Test',
    testType: r.tests?.[0]?.unit || '',
    result: r.tests?.[0]?.result || '',
    referenceRange: r.tests?.[0]?.referenceRange || '',
    priority: r.urgency === 'urgent' || r.urgency === 'stat' ? 'urgent' : 'normal',
    technician: r.processed_by_user,
  }))

  return NextResponse.json({ reports: mapped })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['doctor', 'hospital_admin', 'lab_technician'].includes((token as any).role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { patientId, testName, testType, priority, notes, hospitalId } = body

  const { data: report, error } = await supabaseAdmin
    .from('lab_reports')
    .insert({
      patient_id: patientId,
      hospital_id: hospitalId || (token as any).hospitalId,
      requested_by: (token as any).id,
      status: 'pending',
      urgency: priority === 'urgent' ? 'urgent' : 'routine',
      notes,
      tests: [{ name: testName, status: 'pending', unit: testType || '' }],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, status, result, referenceRange, notes, fileUrl } = body

  const updates: any = {}
  if (notes) updates.notes = notes
  if (fileUrl) updates.report_url = fileUrl

  if (status === 'completed') {
    updates.status = 'completed'
    updates.processed_by = (token as any).id
    updates.reported_at = new Date().toISOString()

    // Update the first test item in JSONB
    const { data: current } = await supabaseAdmin
      .from('lab_reports')
      .select('tests, patient_id')
      .eq('id', id)
      .single()

    if (current?.tests) {
      const tests = [...current.tests]
      if (tests[0]) {
        tests[0] = { ...tests[0], result: result || '', referenceRange: referenceRange || '', status: 'completed' }
      }
      updates.tests = tests
    }

    // Notify patient
    if (current?.patient_id) {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('user_id')
        .eq('id', current.patient_id)
        .single()
      if (patient?.user_id) {
        await supabaseAdmin.from('notifications').insert({
          user_id: patient.user_id,
          type: 'lab_result',
          title: 'Lab Report Ready',
          message: 'Your lab report is ready. Check the Lab Reports section to view your results.',
          data: { reportId: id },
          actionable: false,
        })
      }
    }
  } else if (status) {
    updates.status = status
  }

  const { data: report, error } = await supabaseAdmin
    .from('lab_reports')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ report })
}
