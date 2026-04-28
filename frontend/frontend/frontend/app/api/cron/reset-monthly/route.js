import { NextResponse } from 'next/server'

// Vercel cron calls this on the 1st of each month at midnight UTC.
// It renews active subscriptions whose period has ended and cancels
// those marked cancel_at_period_end = true.
export async function GET(request) {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = request.headers.get('authorization')
        if (auth !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL
    if (!backendUrl) {
        return NextResponse.json({ error: 'NEXT_PUBLIC_API_URL not configured' }, { status: 500 })
    }

    try {
        const res = await fetch(`${backendUrl}/api/subscriptions/cron/reset-monthly`, {
            method: 'POST',
            headers: { 'x-cron-secret': cronSecret || '' }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Backend responded ${res.status}`)
        console.log('reset-monthly cron result:', data)
        return NextResponse.json({ success: true, ...data })
    } catch (err) {
        console.error('reset-monthly cron error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
