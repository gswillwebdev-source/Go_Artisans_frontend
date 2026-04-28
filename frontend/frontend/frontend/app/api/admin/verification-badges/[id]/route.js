import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function verifyAdmin(request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    if (error || !user) return null
    const { data: profile } = await adminClient.from('users').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'admin') return null
    return user
}

// PATCH /api/admin/verification-badges/[id]
// Body: { status: 'approved'|'rejected'|'revoked', rejection_reason?, notes? }
export async function PATCH(request, { params }) {
    const adminUser = await verifyAdmin(request)
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Badge ID required' }, { status: 400 })

    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { status, rejection_reason, notes } = body
    const allowed = ['approved', 'rejected', 'revoked', 'pending']
    if (!allowed.includes(status)) {
        return NextResponse.json({ error: 'Invalid status. Must be approved, rejected, revoked, or pending.' }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await adminClient
        .from('verification_badges')
        .update({
            status,
            rejection_reason: rejection_reason?.trim() || null,
            notes: notes?.trim() || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: adminUser.id,
        })
        .eq('id', id)
        .select()
        .single()

    if (error) {
        console.error('[Admin Badge PATCH]', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, badge: data })
}
