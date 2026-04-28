import { NextResponse } from 'next/server'

// Vercel cron calls this daily at midnight UTC.
// It triggers the backend to process expired trials:
//   1. Sends billing emails + FedaPay checkout links to users whose trial ended
//   2. Disables subscriptions that have been in payment_due for > 3 days
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
        const res = await fetch(`${backendUrl}/api/subscriptions/cron/process-trials`, {
            method: 'POST',
            headers: { 'x-cron-secret': cronSecret || '' }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `Backend responded ${res.status}`)
        console.log('process-trials cron result:', data)
        return NextResponse.json({ success: true, ...data })
    } catch (err) {
        console.error('process-trials cron error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
