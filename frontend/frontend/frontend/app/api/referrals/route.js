import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const TIERS = [
    { min: 1000, label: 'Legend', stars: 5 },
    { min: 350, label: 'Champion', stars: 4 },
    { min: 250, label: 'Promoter', stars: 3 },
    { min: 150, label: 'Advocate', stars: 2 },
    { min: 50, label: 'Starter', stars: 1 },
    { min: 0, label: 'None', stars: 0 },
]

function getTier(count) {
    return TIERS.find(t => count >= t.min) || TIERS[TIERS.length - 1]
}

function nextTier(count) {
    const milestones = [50, 150, 250, 350, 1000]
    return milestones.find(m => m > count) ?? null
}

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
}

function makeAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ACCOUNT_KEY
    )
}

async function getAuthUser(request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    try {
        const client = makeAdminClient()
        const { data: { user }, error } = await client.auth.getUser(token)
        if (error) {
            console.error('[Referrals] auth.getUser error:', error.message)
            return null
        }
        return user ?? null
    } catch (err) {
        console.error('[Referrals] getAuthUser exception:', err)
        return null
    }
}

/** GET /api/referrals */
export async function GET(request) {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const client = makeAdminClient()

    let userRow
    try {
        const { data, error: userErr } = await client
            .from('users')
            .select('id, referral_code, referral_count')
            .eq('id', authUser.id)
            .single()

        if (userErr) {
            console.warn('[Referrals] users select error (migration may not be run):', userErr.message)
            userRow = { id: authUser.id, referral_code: null, referral_count: 0 }
        } else {
            userRow = data
        }
    } catch (e) {
        userRow = { id: authUser.id, referral_code: null, referral_count: 0 }
    }

    let code = userRow.referral_code

    if (!code) {
        let attempts = 0
        while (!code && attempts < 5) {
            const candidate = generateCode()
            const { error: updateErr } = await client
                .from('users')
                .update({ referral_code: candidate })
                .eq('id', authUser.id)
            if (!updateErr) code = candidate
            attempts++
        }
        if (!code) {
            code = authUser.id.replace(/-/g, '').slice(0, 8).toUpperCase()
        }
    }

    let referralCount = 0
    try {
        const { count } = await client
            .from('referrals')
            .select('*', { count: 'exact', head: true })
            .eq('referrer_id', authUser.id)
        referralCount = count ?? 0
    } catch (_) {
        referralCount = userRow.referral_count ?? 0
    }

    if (referralCount !== (userRow.referral_count ?? 0)) {
        await client
            .from('users')
            .update({ referral_count: referralCount })
            .eq('id', authUser.id)
            .catch(() => { })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goartisans.online'
    const tier = getTier(referralCount)
    const next = nextTier(referralCount)

    return NextResponse.json({
        code,
        referral_link: `${appUrl}/register?ref=${code}`,
        count: referralCount,
        tier,
        next_milestone: next,
        progress_to_next: next ? Math.min(100, Math.round((referralCount / next) * 100)) : 100,
    })
}

/** POST /api/referrals */
export async function POST(request) {
    const authUser = await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let body
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { referral_code } = body
    if (!referral_code || typeof referral_code !== 'string') {
        return NextResponse.json({ error: 'referral_code required' }, { status: 400 })
    }

    const safeCode = referral_code.trim().toUpperCase().slice(0, 20)
    const client = makeAdminClient()

    const { data: referrer, error: refErr } = await client
        .from('users')
        .select('id')
        .eq('referral_code', safeCode)
        .single()

    if (refErr || !referrer) {
        return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
    }

    if (referrer.id === authUser.id) {
        return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 })
    }

    const { error: insertErr } = await client
        .from('referrals')
        .insert({ referrer_id: referrer.id, referee_id: authUser.id })

    if (insertErr) {
        if (insertErr.code === '23505') {
            return NextResponse.json({ success: true, already_recorded: true })
        }
        return NextResponse.json({ error: 'Failed to record referral' }, { status: 500 })
    }

    await client.rpc('increment_referral_count', { uid: referrer.id }).catch(async () => {
        const { data: ref } = await client.from('users').select('referral_count').eq('id', referrer.id).single()
        await client.from('users').update({ referral_count: (ref?.referral_count ?? 0) + 1 }).eq('id', referrer.id)
    })

    return NextResponse.json({ success: true })
}
