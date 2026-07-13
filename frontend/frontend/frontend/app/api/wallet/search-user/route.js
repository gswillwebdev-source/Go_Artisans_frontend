import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

// GET /api/wallet/search-user?q=name — find a user to send money to
export async function GET(request) {
    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server config missing' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7)
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authErr } = await admin.auth.getUser(token)
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const q = new URL(request.url).searchParams.get('q') || ''
    if (q.trim().length < 2) {
        return NextResponse.json({ users: [] })
    }

    const { data: users } = await admin
        .from('users')
        .select('id, first_name, last_name, profile_picture, user_type')
        .neq('id', user.id)
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8)

    return NextResponse.json({ users: users || [] })
}
