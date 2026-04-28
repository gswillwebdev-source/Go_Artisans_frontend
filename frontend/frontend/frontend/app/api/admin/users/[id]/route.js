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

    const { data: profile } = await adminClient
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

    if (profile?.user_type !== 'admin') return null
    return user
}

export async function DELETE(request, { params }) {
    const user = await verifyAdmin(request)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Delete from users table (cascade will handle related rows)
    const { error: dbError } = await adminClient.from('users').delete().eq('id', id)
    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    // Also delete from auth.users
    const { error: authError } = await adminClient.auth.admin.deleteUser(id)
    if (authError) {
        console.error('Auth user delete error (non-fatal):', authError.message)
    }

    return NextResponse.json({ success: true })
}

// PATCH: suspend/unsuspend or edit basic fields
export async function PATCH(request, { params }) {
    const adminUser = await verifyAdmin(request)
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    let body
    try { body = await request.json() } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { is_suspended, suspension_reason, first_name, last_name } = body
    const updates = {}
    if (is_suspended !== undefined) updates.is_suspended = Boolean(is_suspended)
    if (suspension_reason !== undefined) updates.suspension_reason = suspension_reason || null
    if (first_name !== undefined) updates.first_name = String(first_name).trim()
    if (last_name !== undefined) updates.last_name = String(last_name).trim()

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await adminClient.from('users').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
