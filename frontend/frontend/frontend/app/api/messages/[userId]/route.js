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

// GET /api/messages/[userId] — load conversation + mark as read
export async function GET(request, { params }) {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, admin } = auth
    const { userId } = await params

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (userId === user.id) return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })

    // Fetch partner profile
    const { data: partner } = await admin
        .from('users')
        .select('id, first_name, last_name, profile_picture, user_type')
        .eq('id', userId)
        .single()
    if (!partner) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Fetch messages between the two users.
    // Use two explicit conditions joined by or() — avoids nested and() syntax issues.
    const { data: messages, error } = await admin
        .from('direct_messages')
        .select('id, sender_id, recipient_id, content, is_read, created_at')
        .or(
            `and(sender_id.eq.${user.id},recipient_id.eq.${userId}),` +
            `and(sender_id.eq.${userId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Mark all unread incoming messages as read in a single update
    await admin
        .from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', userId)
        .eq('recipient_id', user.id)
        .eq('is_read', false)

    return NextResponse.json({ partner, messages: messages ?? [] })
}

// POST /api/messages/[userId] — send a message
export async function POST(request, { params }) {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, admin } = auth
    const { userId } = await params

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
    if (userId === user.id) return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })

    let body
    try { body = await request.json() } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const content = String(body?.content || '').trim()
    if (!content) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    if (content.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 })

    // Verify recipient exists
    const { data: recipient } = await admin
        .from('users')
        .select('id')
        .eq('id', userId)
        .single()
    if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

    const { data: message, error } = await admin
        .from('direct_messages')
        .insert({ sender_id: user.id, recipient_id: userId, content })
        .select('id, sender_id, recipient_id, content, is_read, created_at')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ message })
}
