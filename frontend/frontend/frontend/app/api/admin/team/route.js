import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import crypto from 'crypto'

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

const DEFAULT_PERMISSIONS = {
    assistant: {
        view_users: true,
        edit_users: false,
        delete_users: false,
        view_contact_info: true,
        send_email: true,
        send_whatsapp: true,
        trigger_campaigns: false,
        view_jobs: false,
        view_applications: false,
        view_verifications: false,
        view_subscriptions: false,
    },
    manager: {
        view_users: true,
        edit_users: true,
        delete_users: false,
        view_contact_info: true,
        send_email: true,
        send_whatsapp: true,
        trigger_campaigns: true,
        view_jobs: true,
        view_applications: true,
        view_verifications: true,
        view_subscriptions: true,
    },
}

// GET /api/admin/team — list all team members
export async function GET(request) {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await client
        .from('admin_team_members')
        .select('id, email, name, role, permissions, status, created_at, accepted_at')
        .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ members: data || [] })
}

// POST /api/admin/team — invite a new team member
export async function POST(request) {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

    const { email, name, role, permissions } = body

    if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    if (!role || !['assistant', 'manager'].includes(role)) return NextResponse.json({ error: 'Role must be assistant or manager' }, { status: 400 })

    const normalizedEmail = email.toLowerCase().trim()
    const client = createClient(supabaseUrl, supabaseServiceKey)

    // Prevent duplicate invites
    const { data: existing } = await client
        .from('admin_team_members')
        .select('id, status')
        .eq('email', normalizedEmail)
        .maybeSingle()

    if (existing) return NextResponse.json({ error: 'This email has already been invited' }, { status: 409 })

    const inviteToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const finalPermissions = (permissions && typeof permissions === 'object')
        ? permissions
        : DEFAULT_PERMISSIONS[role]

    const { data: member, error: insertError } = await client
        .from('admin_team_members')
        .insert({
            invited_by: admin.id,
            email: normalizedEmail,
            name: name ? String(name).trim() : null,
            role,
            permissions: finalPermissions,
            invite_token: inviteToken,
            invite_expires_at: expiresAt,
        })
        .select()
        .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    // Send invitation email via Resend
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goartisans.online'
    const inviteLink = `${appUrl}/admin/invite/${inviteToken}`

    try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
            from: 'GoArtisans Admin <noreply@goartisans.online>',
            to: normalizedEmail,
            subject: "You've been invited to join the GoArtisans Admin Team",
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#dc2626;padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:700;">GoArtisans Admin</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111827;margin-top:0;font-size:20px;">You've been invited!</h2>
      <p style="color:#4b5563;line-height:1.6;">
        You have been invited to join the <strong>GoArtisans</strong> admin team as a
        <strong>${role === 'manager' ? 'Manager' : 'Assistant'}</strong>.
      </p>
      <p style="color:#4b5563;line-height:1.6;">
        Click the button below to set up your password and activate your account.
        This invitation expires in <strong>7 days</strong>.
      </p>
      <div style="text-align:center;margin:32px 0;">
        <a href="${inviteLink}"
           style="background:#dc2626;color:white;text-decoration:none;padding:14px 36px;
                  border-radius:8px;font-weight:700;font-size:16px;display:inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color:#9ca3af;font-size:13px;word-break:break-all;">
        Or copy this link:<br>${inviteLink}
      </p>
      <hr style="border:none;border-top:1px solid #f3f4f6;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        If you didn't expect this email, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>`
        })
    } catch (emailErr) {
        console.error('[TEAM INVITE] Failed to send invite email:', emailErr.message)
        // Don't fail the invite — admin can share the link manually
    }

    return NextResponse.json({ member, inviteLink }, { status: 201 })
}
