import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function getAuthUser(request) {
    if (!supabaseUrl || !supabaseServiceKey) return null
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error } = await admin.auth.getUser(token)
    if (error || !user) return null
    return { user, admin }
}

// GET /api/wallet/balance — returns wallet balance + recent transactions
export async function GET(request) {
    const auth = await getAuthUser(request)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { user, admin } = auth

    const [walletResult, txResult] = await Promise.all([
        admin
            .from('wallets')
            .select('balance_xof, updated_at')
            .eq('user_id', user.id)
            .maybeSingle(),
        admin
            .from('wallet_transactions')
            .select('id, type, amount_xof, description, reference_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20),
    ])

    return NextResponse.json({
        balance_xof: walletResult.data?.balance_xof ?? 0,
        transactions: txResult.data ?? [],
    })
}
