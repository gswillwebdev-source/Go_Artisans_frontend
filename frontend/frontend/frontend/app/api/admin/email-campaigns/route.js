import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { runEmailCampaigns } from '@/lib/emailCampaigns'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function verifyAdmin(request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    if (error || !user) return null
    const { data: profile } = await adminClient.from('users').select('user_type').eq('id', user.id).single()
    if (profile?.user_type !== 'admin') return null
    return user
}

// GET — fetch email campaign stats and recent logs
export async function GET(request) {
    const user = await verifyAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: logs } = await adminClient.from('email_logs')
        .select('id, user_id, email_type, sent_at')
        .gte('sent_at', sevenDaysAgo)
        .order('sent_at', { ascending: false })
        .limit(200)

    const LABELS = {
        welcome: 'Welcome',
        profile_reminder: 'Profile Reminder',
        no_applications: 'No Applications',
        app_accepted: 'Application Accepted',
        review_request: 'Review Request (Worker)',
        review_request_client: 'Review Request (Client)',
        re_engagement: 'Re-engagement',
    }

    const counts = {}
    for (const l of logs || []) {
        counts[l.email_type] = (counts[l.email_type] || 0) + 1
    }

    const breakdown = Object.entries(counts).map(([type, count]) => ({
        type,
        label: LABELS[type] || type,
        count,
    })).sort((a, b) => b.count - a.count)

    return NextResponse.json({
        total: logs?.length || 0,
        breakdown,
        recentLogs: (logs || []).slice(0, 50),
    })
}

// POST — manually trigger all email campaigns
export async function POST(request) {
    const user = await verifyAdmin(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    try {
        const results = await runEmailCampaigns(adminClient)
        return NextResponse.json({ success: true, ...results })
    } catch (err) {
        console.error('Manual email campaign error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
