import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Runs every 3 days via Vercel cron (see vercel.json).
// Executes a lightweight query to prevent Supabase free tier from pausing.
export async function GET(request) {
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret) {
        const auth = request.headers.get('authorization')
        if (auth !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        )

        // Lightweight ping — just fetch 1 row from any public table
        const { error } = await supabase.from('profiles').select('id').limit(1)

        if (error) {
            console.error('[keepalive] Supabase ping error:', error.message)
            return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
        }

        console.log('[keepalive] Supabase ping successful at', new Date().toISOString())
        return NextResponse.json({ ok: true, timestamp: new Date().toISOString() })
    } catch (err) {
        console.error('[keepalive] Unexpected error:', err)
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
}
