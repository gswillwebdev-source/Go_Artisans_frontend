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

// PATCH /api/messages/[userId]/read
// Marks all unread messages FROM userId TO the current user as read.
// Lightweight — no data returned, just updates the DB flag.
export async function PATCH(request, { params }) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, admin } = auth
  const { userId } = await params

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

  const { error } = await admin
    .from('direct_messages')
    .update({ is_read: true })
    .eq('sender_id', userId)
    .eq('recipient_id', user.id)
    .eq('is_read', false)

  if (error) {
    console.error('[messages/read] update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
