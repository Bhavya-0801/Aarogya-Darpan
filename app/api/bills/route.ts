import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function generateBillNumber() {
  const date = new Date()
  const year = date.getFullYear().toString().slice(-2)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0')
  return `INV${year}${month}${random}`
}

function normalizeBill(b: any) {
  const patient = b.patient || {}
  const patientUser = patient.user || {}
  return {
    ...b,
    _id: b.id,
    billNumber: b.bill_number,
    totalAmount: Number(b.total_amount) || 0,
    paidAmount: Number(b.paid_amount) || 0,
    paymentMode: b.payment_method || 'cash',
    patient: {
      ...patient,
      _id: patient.id,
      name: patientUser.name || 'Patient',
      user: patientUser,
    },
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const patientIdParam = searchParams.get('patientId')
    const status = searchParams.get('status')
    const role = (token as any).role

    let query = supabaseAdmin
      .from('bills')
      .select('*, patient:patients(id, uhid, user:users(id, name, email, phone)), created_by_user:users!bills_created_by_fkey(id, name)')
      .order('created_at', { ascending: false })
      .limit(100)

    if (role === 'patient') {
      const { data: patient } = await supabaseAdmin
        .from('patients')
        .select('id')
        .eq('user_id', (token as any).id)
        .single()

      if (!patient) return NextResponse.json({ bills: [] })
      query = query.eq('patient_id', patient.id)
    } else {
      const hospitalId = (token as any).hospitalId
      if (hospitalId) query = query.eq('hospital_id', hospitalId)
      if (patientIdParam) query = query.eq('patient_id', patientIdParam)
      if (status && status !== 'all') query = query.eq('status', status)
    }

    const { data: bills, error } = await query
    if (error) {
      console.error('[Bills GET error]:', error)
      return NextResponse.json({ bills: [] })
    }

    return NextResponse.json({ bills: (bills || []).map(normalizeBill) })
  } catch (err: any) {
    console.error('[Bills API error]:', err)
    return NextResponse.json({ bills: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!['hospital_admin', 'receptionist'].includes((token as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const hospitalId = (token as any).hospitalId
    if (!hospitalId) return NextResponse.json({ error: 'Hospital not linked' }, { status: 400 })

    const body = await req.json()
    const patientId = body.patientId || body.patient_id
    if (!patientId) return NextResponse.json({ error: 'Patient required' }, { status: 400 })

    const items = Array.isArray(body.items) ? body.items : []
    const totalAmount = Number(body.totalAmount || body.total_amount) || 0
    const paidAmount = Number(body.paidAmount || body.paid_amount) || 0
    const discount = Number(body.discount) || 0
    const notes = body.notes || ''
    const paymentMethod = body.paymentMode || body.payment_method || 'cash'
    const status = body.status || 'pending'

    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .insert({
        bill_number: generateBillNumber(),
        patient_id: patientId,
        hospital_id: hospitalId,
        items,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        discount,
        notes,
        payment_method: paymentMethod,
        status,
        created_by: (token as any).id,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bill Insert Error]:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ bill: normalizeBill(bill) }, { status: 201 })
  } catch (err: any) {
    console.error('[Bills POST error]:', err)
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
    if (body.paidAmount !== undefined || body.paid_amount !== undefined) {
      updates.paid_amount = Number(body.paidAmount ?? body.paid_amount) || 0
    }
    if (body.totalAmount !== undefined || body.total_amount !== undefined) {
      updates.total_amount = Number(body.totalAmount ?? body.total_amount) || 0
    }
    if (body.paymentMode || body.payment_method) {
      updates.payment_method = body.paymentMode || body.payment_method
    }
    if (body.notes !== undefined) updates.notes = body.notes

    const { data: bill, error } = await supabaseAdmin
      .from('bills')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bill: normalizeBill(bill) })
  } catch (err: any) {
    console.error('[Bills PATCH error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
