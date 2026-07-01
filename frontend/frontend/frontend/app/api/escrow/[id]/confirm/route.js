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

// PATCH /api/escrow/[id]/confirm
// Worker confirms job is done → status becomes 'worker_confirmed'
// Client confirms + submits review → funds released, status becomes 'completed'
export async function PATCH(request, { params }) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, admin } = auth

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Escrow ID required' }, { status: 400 })

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { role, rating, comment } = body || {}

  // Load escrow
  const { data: escrow, error: fetchErr } = await admin
    .from('escrow_payments')
    .select('id, client_id, worker_id, amount_xof, worker_receives_xof, status, description')
    .eq('id', id)
    .single()

  if (fetchErr || !escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })
  if (!['locked', 'worker_confirmed'].includes(escrow.status)) {
    return NextResponse.json({ error: `Escrow is already ${escrow.status}` }, { status: 400 })
  }

  const isWorker = user.id === escrow.worker_id
  const isClient = user.id === escrow.client_id

  if (!isWorker && !isClient) {
    return NextResponse.json({ error: 'You are not a party to this escrow' }, { status: 403 })
  }

  // ── WORKER CONFIRMS WORK IS DONE ─────────────────────────────────────
  if (role === 'worker') {
    if (!isWorker) {
      return NextResponse.json({ error: 'Only the worker can confirm work completion' }, { status: 403 })
    }
    if (escrow.status !== 'locked') {
      return NextResponse.json({ error: 'Work has already been confirmed' }, { status: 400 })
    }

    const { data: updated } = await admin
      .from('escrow_payments')
      .update({ status: 'worker_confirmed', worker_confirmed_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, status, worker_confirmed_at')
      .single()

    return NextResponse.json({
      success: true,
      escrow: updated,
      message: 'Work marked as complete. Waiting for client confirmation and review.',
    })
  }

  // ── CLIENT CONFIRMS + LEAVES REVIEW → RELEASE FUNDS ─────────────────
  if (role === 'client') {
    if (!isClient) {
      return NextResponse.json({ error: 'Only the client can confirm completion' }, { status: 403 })
    }
    if (escrow.status !== 'worker_confirmed') {
      return NextResponse.json({
        error: 'The worker must first mark work as complete before you can confirm',
      }, { status: 400 })
    }

    const ratingNum = Number(rating)
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Check review not already submitted
    const { data: existingReview } = await admin
      .from('job_reviews')
      .select('id')
      .eq('escrow_id', id)
      .maybeSingle()

    if (existingReview) {
      return NextResponse.json({ error: 'Review already submitted for this escrow' }, { status: 409 })
    }

    const now = new Date().toISOString()

    // 1. Submit the review
    const { error: reviewErr } = await admin.from('job_reviews').insert({
      escrow_id: id,
      client_id: escrow.client_id,
      worker_id: escrow.worker_id,
      rating: ratingNum,
      comment: String(comment || '').trim().slice(0, 500) || null,
    })

    if (reviewErr) {
      return NextResponse.json({ error: 'Failed to save review' }, { status: 500 })
    }

    // 2. Credit worker wallet atomically
    const { error: creditErr } = await admin.rpc('credit_wallet', {
      p_user_id: escrow.worker_id,
      p_amount_xof: Number(escrow.worker_receives_xof),
    })

    if (creditErr) {
      console.error('[escrow/confirm] credit error:', creditErr)
      return NextResponse.json({ error: 'Failed to release funds to worker' }, { status: 500 })
    }

    // 3. Mark escrow completed
    const { data: completed } = await admin
      .from('escrow_payments')
      .update({
        status: 'completed',
        client_confirmed_at: now,
        released_at: now,
      })
      .eq('id', id)
      .select('id, status, client_confirmed_at, released_at, worker_receives_xof')
      .single()

    // 4. Record ledger entries for both parties
    await Promise.all([
      admin.from('wallet_transactions').insert({
        user_id: escrow.worker_id,
        type: 'escrow_release',
        amount_xof: Number(escrow.worker_receives_xof),
        reference_id: id,
        description: `Payment released: ${escrow.description?.slice(0, 60) || 'Job completed'}`,
      }),
    ])

    return NextResponse.json({
      success: true,
      escrow: completed,
      message: `Payment of ${Number(escrow.worker_receives_xof).toLocaleString()} XOF has been released to the worker. Thank you for your review!`,
    })
  }

  return NextResponse.json({ error: 'Invalid role. Must be "worker" or "client"' }, { status: 400 })
}
