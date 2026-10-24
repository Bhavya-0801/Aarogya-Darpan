import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

function normalizeMedicine(m: any) {
  return {
    ...m,
    _id: m.id,
    genericName: m.generic_name || '',
    batchNumber: m.batch_number || '',
    expiryDate: m.expiry_date,
    minStockLevel: m.min_stock_level,
    unitPrice: Number(m.unit_price) || 0,
    sellingPrice: Number(m.selling_price) || 0,
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (token as any).role
    const userId = (token as any).id

    let hospitalId = (token as any).hospitalId
    if (!hospitalId && role === 'hospital_admin') {
      const { data: hospital } = await supabaseAdmin
        .from('hospitals')
        .select('id')
        .eq('admin_id', userId)
        .single()
      if (hospital) hospitalId = hospital.id
    }

    if (!hospitalId) return NextResponse.json({ medicines: [] })

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter')
    const search = searchParams.get('search') || ''

    let query = supabaseAdmin
      .from('medicines')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('expiry_date', { ascending: true })

    const now = new Date().toISOString().split('T')[0]
    const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    if (filter === 'expired') {
      query = query.lt('expiry_date', now)
    } else if (filter === 'expiring-soon') {
      query = query.gt('expiry_date', now).lte('expiry_date', soon)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,generic_name.ilike.%${search}%,batch_number.ilike.%${search}%`)
    }

    const { data: medicines, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const filtered = filter === 'low-stock'
      ? (medicines || []).filter((m: any) => m.quantity <= m.min_stock_level)
      : medicines

    return NextResponse.json({ medicines: (filtered || []).map(normalizeMedicine) })
  } catch (err: any) {
    console.error('[Inventory GET Error]:', err)
    return NextResponse.json({ medicines: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const role = (token as any).role
    if (!['pharmacy', 'hospital_admin'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const userId = (token as any).id
    let hospitalId = (token as any).hospitalId
    if (!hospitalId && role === 'hospital_admin') {
      const { data: hospital } = await supabaseAdmin.from('hospitals').select('id').eq('admin_id', userId).single()
      if (hospital) hospitalId = hospital.id
    }

    if (!hospitalId) return NextResponse.json({ error: 'No hospital associated' }, { status: 400 })

    const body = await req.json()
    const { name, genericName, category, manufacturer, batchNumber, expiryDate, quantity, minStockLevel, unitPrice, sellingPrice, unit, description } = body

    if (!name || !category || !expiryDate || quantity === undefined) {
      return NextResponse.json({ error: 'Name, category, expiry date and quantity are required' }, { status: 400 })
    }

    const { data: medicine, error } = await supabaseAdmin
      .from('medicines')
      .insert({
        hospital_id: hospitalId,
        name: String(name).trim(),
        generic_name: genericName || '',
        category,
        manufacturer: manufacturer || '',
        batch_number: batchNumber || '',
        expiry_date: expiryDate,
        quantity: Number(quantity),
        min_stock_level: Number(minStockLevel) || 10,
        unit_price: Number(unitPrice) || 0,
        selling_price: Number(sellingPrice) || 0,
        unit: unit || 'tablet',
        description,
        added_by: userId,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ medicine: normalizeMedicine(medicine) }, { status: 201 })
  } catch (err: any) {
    console.error('[Inventory POST Error]:', err)
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
    if (body.quantity !== undefined) updates.quantity = Number(body.quantity)
    if (body.minStockLevel !== undefined || body.min_stock_level !== undefined) {
      updates.min_stock_level = Number(body.minStockLevel || body.min_stock_level)
    }
    if (body.unitPrice !== undefined || body.unit_price !== undefined) {
      updates.unit_price = Number(body.unitPrice || body.unit_price)
    }
    if (body.sellingPrice !== undefined || body.selling_price !== undefined) {
      updates.selling_price = Number(body.sellingPrice || body.selling_price)
    }

    const { data: medicine, error } = await supabaseAdmin
      .from('medicines')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !medicine) return NextResponse.json({ error: error?.message || 'Medicine not found' }, { status: 404 })
    return NextResponse.json({ medicine: normalizeMedicine(medicine) })
  } catch (err: any) {
    console.error('[Inventory PATCH Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!['pharmacy', 'hospital_admin'].includes((token as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('medicines').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Inventory DELETE Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
