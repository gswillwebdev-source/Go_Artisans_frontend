import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function getAuthUser(request) {
    if (!supabaseUrl || !supabaseServiceKey) return null
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return null
    return { user, admin }
}

// GET /api/messages — list all conversations (most recent message per partner)
export async function GET(request) {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, admin } = auth

    // Get the latest message per conversation partner.
    // Use explicit FK constraint names so PostgREST resolves the ambiguous
    // sender_id/recipient_id → users joins correctly.
    const { data: messages, error } = await admin
        .from('direct_messages')
        .select(`
      id, content, is_read, created_at, sender_id, recipient_id,
      sender:users!direct_messages_sender_id_fkey(id, first_name, last_name, profile_picture),
      recipient:users!direct_messages_recipient_id_fkey(id, first_name, last_name, profile_picture)
    `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Deduplicate to one entry per conversation partner
    const seen = new Set()
    const conversations = []
    for (const msg of messages || []) {
        const partnerId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
        if (seen.has(partnerId)) continue
        seen.add(partnerId)
        conversations.push({
            partner: msg.sender_id === user.id ? msg.recipient : msg.sender,
            last_message: msg.content,
            last_at: msg.created_at,
            unread: !msg.is_read && msg.recipient_id === user.id,
        })
    }

    // Count total unread messages
    const { count: unreadCount } = await admin
        .from('direct_messages')
        .select('id', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

    return NextResponse.json({ conversations, unread_count: unreadCount ?? 0 })
}
