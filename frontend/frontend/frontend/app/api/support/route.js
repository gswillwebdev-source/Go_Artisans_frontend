import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_SUPPORT_CHAT_ID

export async function POST(request) {
    try {
        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            console.error('[Support] Telegram env vars not configured')
            return NextResponse.json({ error: 'Support service not configured.' }, { status: 503 })
        }

        const body = await request.json()
        const { category, message, contactMethod, contactDetail, priority } = body

        // Basic validation
        if (!message || typeof message !== 'string' || message.trim().length < 10) {
            return NextResponse.json({ error: 'Message must be at least 10 characters.' }, { status: 400 })
        }
        if (message.trim().length > 2000) {
            return NextResponse.json({ error: 'Message must be under 2000 characters.' }, { status: 400 })
        }
        if (!contactMethod || !contactDetail) {
            return NextResponse.json({ error: 'Contact method and detail are required.' }, { status: 400 })
        }
        // Sanitize inputs — strip any HTML/script content
        const safeMessage = message.trim().replace(/[<>]/g, '')
        const safeContact = contactDetail.trim().replace(/[<>]/g, '')
        const safeCategory = (category || 'General').trim().replace(/[<>]/g, '')

        // Optionally pull user identity from Supabase session (best-effort)
        let userInfo = 'Anonymous'
        try {
            const authHeader = request.headers.get('authorization')
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7)
                const adminClient = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ACCOUNT_KEY
                )
                const { data: { user } } = await adminClient.auth.getUser(token)
                if (user) {
                    const { data: profile } = await adminClient
                        .from('users')
                        .select('first_name, last_name, email, user_type')
                        .eq('id', user.id)
                        .maybeSingle()
                    if (profile) {
                        userInfo = `${profile.first_name || ''} ${profile.last_name || ''} (${profile.user_type || 'user'}) — ${profile.email || user.email}`
                    } else {
                        userInfo = user.email || user.id
                    }
                }
            }
        } catch (_) {
            // Non-blocking — user info is best-effort
        }

        const now = new Date().toLocaleString('en-GB', {
            timeZone: 'UTC',
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })

        const telegramText =
            (priority ? `🚨 *PRIORITY REQUEST — Premium Member*\n` : `🆘 *New Support Request*\n`) +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📂 *Category:* ${safeCategory}\n` +
            `👤 *User:* ${userInfo}\n` +
            `🕐 *Time (UTC):* ${now}\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📝 *Message:*\n${safeMessage}\n` +
            `━━━━━━━━━━━━━━━━━━\n` +
            `📬 *Best way to reply:*\n` +
            `  • Method: ${contactMethod}\n` +
            `  • Detail: ${safeContact}`

        const tgRes = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHAT_ID,
                    text: telegramText,
                    parse_mode: 'Markdown',
                })
            }
        )

        if (!tgRes.ok) {
            const tgErr = await tgRes.json().catch(() => ({}))
            console.error('[Support] Telegram error:', tgErr)
            return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 502 })
        }

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('[Support] Unexpected error:', err)
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
    }
}
