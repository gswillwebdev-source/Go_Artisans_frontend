import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function verifyAdmin(request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    const client = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error } = await client.auth.getUser(token)
    if (error || !user) return null
    const { data: profile } = await client.from('users').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'admin') return null
    return user
}

// DELETE /api/admin/team/[id] — remove a team member
export async function DELETE(request, { params }) {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

    const client = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch the member so we can delete their staff account too
    const { data: member } = await client
        .from('admin_team_members')
        .select('user_id')
        .eq('id', id)
        .single()

    // Remove from team table
    const { error } = await client.from('admin_team_members').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If they accepted and have a staff account, remove it
    if (member?.user_id) {
        await client.from('users').delete().eq('id', member.user_id)
        await client.auth.admin.deleteUser(member.user_id)
    }

    return NextResponse.json({ success: true })
}

// PATCH /api/admin/team/[id] — update permissions, role, or status
export async function PATCH(request, { params }) {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Member ID required' }, { status: 400 })

    let body
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const { permissions, role, status } = body
    const updates = {}
    if (permissions && typeof permissions === 'object') updates.permissions = permissions
    if (role && ['assistant', 'manager'].includes(role)) updates.role = role
    if (status && ['active', 'revoked'].includes(status)) updates.status = status

    if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const client = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await client
        .from('admin_team_members')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ member: data })
}
