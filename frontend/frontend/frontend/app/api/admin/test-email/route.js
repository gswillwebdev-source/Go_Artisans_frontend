import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

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
        .select('user_type, email, first_name')
        .eq('id', user.id)
        .single()
    if (profile?.user_type !== 'admin') return null
    return { ...user, email: profile.email || user.email, first_name: profile.first_name }
}

export async function POST(request) {
    const adminUser = await verifyAdmin(request)
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
        return NextResponse.json({
            error: 'RESEND_API_KEY environment variable is not set in Vercel. Go to your Vercel project → Settings → Environment Variables and add it.',
            configured: false
        }, { status: 500 })
    }

    const resend = new Resend(resendKey)
    const toEmail = adminUser.email
    const fromEmail = 'Go Artisans <noreply@goartisans.online>'

    try {
        const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: toEmail,
            subject: '✅ GoArtisans Email Test — It Works!',
            html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f4f4f5;padding:32px;margin:0;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px;border-radius:8px;text-align:center;margin-bottom:24px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Go Artisans</h1>
    </div>
    <h2 style="color:#111827;font-size:20px;">✅ Email Delivery Is Working!</h2>
    <p style="color:#6b7280;font-size:15px;line-height:1.6;">
      Hi <strong>${adminUser.first_name || 'Admin'}</strong>,<br><br>
      This is a test email sent from the GoArtisans admin panel.<br>
      If you are reading this, <strong>Resend is correctly configured</strong> and emails are being delivered successfully.
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="color:#9ca3af;font-size:12px;">Sent to: ${toEmail}<br>From: ${fromEmail}</p>
  </div>
</body>
</html>`
        })

        if (error) {
            return NextResponse.json({
                error: error.message,
                hint: error.message?.includes('domain') || error.message?.includes('sender')
                    ? 'The domain goartisans.online is not verified in Resend. Go to resend.com → Domains and add + verify goartisans.online, then add the DNS records to your domain registrar.'
                    : 'Check that your RESEND_API_KEY is valid and not expired.',
                configured: true,
                resendError: error
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            message: `Test email sent to ${toEmail}. Check your inbox (and spam folder).`,
            emailId: data?.id
        })
    } catch (err) {
        return NextResponse.json({
            error: err.message,
            hint: 'Unexpected error. Check Vercel logs for details.',
            configured: true
        }, { status: 500 })
    }
}
