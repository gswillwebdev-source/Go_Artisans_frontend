import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/notifications/broadcasts
// Returns recent broadcast notifications + which ones this user has read
export async function GET(request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get last 30 broadcast notifications
    const { data: broadcasts } = await admin
        .from('broadcast_notifications')
        .select(`
      id, type, title, body, action_url, created_at,
      actor:actor_id(id, first_name, last_name, profile_picture)
    `)
        .order('created_at', { ascending: false })
        .limit(30)

    // Get which ones this user has already read
    const broadcastIds = (broadcasts || []).map(b => b.id)
    let readIds = new Set()
    if (broadcastIds.length > 0) {
        const { data: reads } = await admin
            .from('broadcast_reads')
            .select('broadcast_id')
            .eq('user_id', user.id)
            .in('broadcast_id', broadcastIds)
        readIds = new Set((reads || []).map(r => r.broadcast_id))
    }

    const result = (broadcasts || []).map(b => ({ ...b, is_read: readIds.has(b.id) }))
    const unread = result.filter(b => !b.is_read).length

    return NextResponse.json({ broadcasts: result, unread_count: unread })
}

// POST /api/notifications/broadcasts/read — mark broadcasts as read
export async function POST(request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const ids = Array.isArray(body?.ids) ? body.ids : []
    if (ids.length === 0) return NextResponse.json({ success: true })

    await admin.from('broadcast_reads').upsert(
        ids.map(id => ({ user_id: user.id, broadcast_id: id })),
        { onConflict: 'user_id,broadcast_id', ignoreDuplicates: true }
    )

    return NextResponse.json({ success: true })
}
