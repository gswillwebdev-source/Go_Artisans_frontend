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

// GET /api/escrow/[id] — load escrow details for both parties
export async function GET(request, { params }) {
  const auth = await getAuthUser(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { user, admin } = auth

  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Escrow ID required' }, { status: 400 })

  const { data: escrow, error: fetchErr } = await admin
    .from('escrow_payments')
    .select(`
      id, amount_xof, platform_fee_xof, worker_receives_xof, description, status,
      worker_confirmed_at, client_confirmed_at, released_at, created_at, job_id,
      client:client_id (id, first_name, last_name, email),
      worker:worker_id (id, first_name, last_name, email)
    `)
    .eq('id', id)
    .single()

  if (fetchErr || !escrow) return NextResponse.json({ error: 'Escrow not found' }, { status: 404 })

  if (user.id !== escrow.client?.id && user.id !== escrow.worker?.id) {
    return NextResponse.json({ error: 'You are not a party to this escrow' }, { status: 403 })
  }

  // Load review if completed
  let review = null
  if (escrow.status === 'completed') {
    const { data: r } = await admin
      .from('job_reviews')
      .select('rating, comment, created_at')
      .eq('escrow_id', id)
      .maybeSingle()
    review = r
  }

  return NextResponse.json({ escrow, review, viewer_role: user.id === escrow.client?.id ? 'client' : 'worker' })
}
