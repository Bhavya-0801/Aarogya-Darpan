import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', (token as any).id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const normalized = (notifications || []).map((n: any) => ({ ...n, _id: n.id }))
    const unreadCount = normalized.filter((n: any) => !n.read).length
    return NextResponse.json({ notifications: normalized, unreadCount })
  } catch (err: any) {
    console.error('[Notifications GET error]:', err)
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const id = body.id || body._id
    const markAllRead = body.markAllRead

    if (markAllRead) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('user_id', (token as any).id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (id) {
      const { error } = await supabaseAdmin
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  } catch (err: any) {
    console.error('[Notifications PATCH error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
