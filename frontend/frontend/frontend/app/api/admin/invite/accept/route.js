import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

// GET /api/admin/invite/accept?token=xxx — validate token, return invite info
export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const client = createClient(supabaseUrl, supabaseServiceKey)
    const { data: member, error } = await client
        .from('admin_team_members')
        .select('id, email, name, role, status, invite_expires_at')
        .eq('invite_token', token)
        .maybeSingle()

    if (error || !member) return NextResponse.json({ error: 'Invalid invitation link' }, { status: 404 })
    if (member.status === 'active') return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 409 })
    if (member.status === 'revoked') return NextResponse.json({ error: 'This invitation has been revoked by the admin' }, { status: 410 })
    if (new Date(member.invite_expires_at) < new Date()) return NextResponse.json({ error: 'This invitation has expired. Please ask the admin to resend it.' }, { status: 410 })

    // Return only safe info (no token)
    return NextResponse.json({ valid: true, email: member.email, name: member.name, role: member.role })
}

// POST /api/admin/invite/accept — create account and activate
export async function POST(request) {
    let body
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const { token, name, password } = body
    if (!token || !password) return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
    if (typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const client = createClient(supabaseUrl, supabaseServiceKey)
    const { data: member, error: memberError } = await client
        .from('admin_team_members')
        .select('id, email, name, role, permissions, status, invite_expires_at')
        .eq('invite_token', token)
        .maybeSingle()

    if (memberError || !member) return NextResponse.json({ error: 'Invalid invitation link' }, { status: 404 })
    if (member.status === 'active') return NextResponse.json({ error: 'This invitation has already been accepted' }, { status: 409 })
    if (member.status === 'revoked') return NextResponse.json({ error: 'This invitation has been revoked' }, { status: 410 })
    if (new Date(member.invite_expires_at) < new Date()) return NextResponse.json({ error: 'This invitation has expired' }, { status: 410 })

    // Create Supabase auth user (email already confirmed)
    const { data: authData, error: authError } = await client.auth.admin.createUser({
        email: member.email,
        password,
        email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

    const userId = authData.user.id
    const displayName = (name && name.trim()) || member.name || member.email.split('@')[0]
    const nameParts = displayName.split(/\s+/)

    // Insert into users table with user_type = 'staff'
    const { error: profileError } = await client.from('users').insert({
        id: userId,
        email: member.email,
        first_name: nameParts[0] || displayName,
        last_name: nameParts.slice(1).join(' ') || '',
        user_type: 'staff',
    })

    if (profileError) {
        // Clean up auth user to avoid orphaned records
        await client.auth.admin.deleteUser(userId).catch(() => { })
        return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Activate the team member record
    const { error: updateError } = await client
        .from('admin_team_members')
        .update({
            user_id: userId,
            name: displayName,
            status: 'active',
            invite_token: null,
            accepted_at: new Date().toISOString(),
        })
        .eq('id', member.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
