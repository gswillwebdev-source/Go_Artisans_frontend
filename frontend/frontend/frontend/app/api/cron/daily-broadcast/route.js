import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/cron/daily-broadcast
// Sends a daily "Good morning" broadcast notification to all users.
// Scheduled via vercel.json cron — runs every day at 8 AM UTC.
export async function GET(request) {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = request.headers.get('authorization')
        if (auth !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey)

    // Count active users to give a sense of community
    const { count: userCount } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })

    // Count jobs posted today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const { count: jobsToday } = await admin
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())

    // Count videos posted today
    const { count: videosToday } = await admin
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString())

    const parts = []
    if (jobsToday > 0) parts.push(`${jobsToday} new job${jobsToday > 1 ? 's' : ''}`)
    if (videosToday > 0) parts.push(`${videosToday} new video${videosToday > 1 ? 's' : ''}`)

    const body = parts.length > 0
        ? `${parts.join(' and ')} posted today. Browse now!`
        : `Connect with ${userCount?.toLocaleString() ?? 'thousands of'} artisans and clients on GoArtisans.`

    const { error } = await admin.from('broadcast_notifications').insert({
        type: 'daily_digest',
        title: '☀️ Good morning from GoArtisans!',
        body,
        action_url: '/',
    })

    if (error) {
        console.error('[daily-broadcast] Insert error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[daily-broadcast] Sent daily digest broadcast')
    return NextResponse.json({ success: true, body })
}
