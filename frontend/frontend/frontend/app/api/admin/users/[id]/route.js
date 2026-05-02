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

    if (profile?.user_type === 'admin') return { user, isAdmin: true, permissions: null }

    if (profile?.user_type === 'staff') {
        const { data: member } = await adminClient
            .from('admin_team_members')
            .select('permissions, status')
            .eq('user_id', user.id)
            .eq('status', 'active')
            .maybeSingle()
        if (member) return { user, isAdmin: false, permissions: member.permissions }
    }

    return null
}

export async function DELETE(request, { params }) {
    const auth = await verifyAdmin(request)
    if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // Staff need delete_users permission
    if (!auth.isAdmin && !auth.permissions?.delete_users) {
        return NextResponse.json({ error: 'Forbidden: delete_users permission required' }, { status: 403 })
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
    const auth = await verifyAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    let body
    try { body = await request.json() } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { is_suspended, suspension_reason, first_name, last_name } = body

    // Suspend/unsuspend is admin-only
    if ((is_suspended !== undefined || suspension_reason !== undefined) && !auth.isAdmin) {
        return NextResponse.json({ error: 'Forbidden: only admins can suspend users' }, { status: 403 })
    }
    // Edit fields requires edit_users permission
    if ((first_name !== undefined || last_name !== undefined) && !auth.isAdmin && !auth.permissions?.edit_users) {
        return NextResponse.json({ error: 'Forbidden: edit_users permission required' }, { status: 403 })
    }
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
