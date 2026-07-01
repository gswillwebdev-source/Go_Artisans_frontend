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

export async function GET(request) {
  const auth = await verifyAdmin(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { adminClient } = auth

  try {
    const { data: withdrawals, error } = await adminClient
      .from('gift_withdrawals')
      .select('id,user_id,coins_amount,estimated_xof,gross_xof,platform_fee_xof,payout_xof,payment_method,phone_number,status,admin_note,processed_by,processed_at,transfer_reference,fedapay_request_id,fedapay_request_status,fedapay_requested_at,created_at,paid_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const rows = withdrawals || []
    const userIds = [...new Set(rows.flatMap(row => [row.user_id, row.processed_by]).filter(Boolean))]

    let userMap = {}
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await adminClient
        .from('users')
        .select('id,first_name,last_name,email')
        .in('id', userIds)

      if (usersError) {
        return NextResponse.json({ error: usersError.message }, { status: 500 })
      }

      userMap = Object.fromEntries((users || []).map(user => [user.id, user]))
    }

    const enriched = rows.map(row => ({
      ...row,
      user: userMap[row.user_id] || null,
      processor: row.processed_by ? userMap[row.processed_by] || null : null,
    }))

    const summary = enriched.reduce((acc, row) => {
      acc.totalRequests += 1
      acc.totalNetXof += row.payout_xof || row.estimated_xof || 0
      if (row.status === 'pending') {
        acc.pendingCount += 1
        acc.pendingNetXof += row.payout_xof || row.estimated_xof || 0
      }
      if (row.status === 'processing') {
        acc.processingCount += 1
        acc.processingNetXof += row.payout_xof || row.estimated_xof || 0
      }
      if (row.status === 'paid') {
        acc.paidCount += 1
        acc.paidNetXof += row.payout_xof || row.estimated_xof || 0
      }
      if (row.status === 'rejected') {
        acc.rejectedCount += 1
      }
      return acc
    }, {
      totalRequests: 0,
      totalNetXof: 0,
      pendingCount: 0,
      pendingNetXof: 0,
      processingCount: 0,
      processingNetXof: 0,
      paidCount: 0,
      paidNetXof: 0,
      rejectedCount: 0,
    })

    return NextResponse.json({ withdrawals: enriched, summary })
  } catch (err) {
    console.error('[Admin Payouts GET]', err)
    return NextResponse.json({ error: err.message || 'Failed to load payouts' }, { status: 500 })
  }
}