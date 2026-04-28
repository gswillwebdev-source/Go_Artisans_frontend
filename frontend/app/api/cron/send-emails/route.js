import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runEmailCampaigns } from '@/lib/emailCampaigns'

export async function GET(request) {
    // Secured by CRON_SECRET — Vercel passes this automatically for cron jobs
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = request.headers.get('authorization')
        if (auth !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ACCOUNT_KEY
    )

    try {
        const results = await runEmailCampaigns(adminClient)
        console.log(`Email campaigns completed: ${results.sent} sent, ${results.failed} failed, ${results.skipped} skipped`)
        return NextResponse.json({ success: true, ...results })
    } catch (err) {
        console.error('Email campaign cron error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
