import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function verifyAdmin(request) {
  if (!supabaseUrl || !supabaseServiceKey) return null

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)
  const { data: { user }, error } = await adminClient.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await adminClient
    .from('users')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'admin') return null
  return { user, adminClient }
}

export async function PATCH(request, { params }) {
  const auth = await verifyAdmin(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Payout ID required' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { status, admin_note, transfer_reference } = body
  if (!['processing', 'paid', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid payout status' }, { status: 400 })
  }

  if (status === 'paid' && !String(transfer_reference || '').trim()) {
    return NextResponse.json({ error: 'Transfer reference is required before marking payout as paid' }, { status: 400 })
  }

  if (status === 'rejected' && !String(admin_note || '').trim()) {
    return NextResponse.json({ error: 'Admin note is required when rejecting a payout' }, { status: 400 })
  }

  const { adminClient, user } = auth

  try {
    const { data: existing, error: existingError } = await adminClient
      .from('gift_withdrawals')
      .select('id,status')
      .eq('id', id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    if (!existing) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    if (existing.status === 'paid' && status !== 'paid') {
      return NextResponse.json({ error: 'Paid payouts cannot be moved back to another status' }, { status: 400 })
    }

    const updates = {
      status,
      admin_note: String(admin_note || '').trim() || null,
      transfer_reference: String(transfer_reference || '').trim() || null,
      processed_by: user.id,
      processed_at: new Date().toISOString(),
    }

    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
    }

    if (status === 'rejected') {
      updates.paid_at = null
    }

    const { data, error } = await adminClient
      .from('gift_withdrawals')
      .update(updates)
      .eq('id', id)
      .select('id,status,admin_note,transfer_reference,processed_by,processed_at,paid_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ payout: data })
  } catch (err) {
    console.error('[Admin Payout PATCH]', err)
    return NextResponse.json({ error: err.message || 'Failed to update payout' }, { status: 500 })
  }
}