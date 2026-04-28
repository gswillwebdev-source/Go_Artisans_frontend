import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

async function verifyAdmin(request) {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error } = await adminClient.auth.getUser(token)
    if (error || !user) return null

    const { data: profile } = await adminClient
        .from('users')
        .select('user_type')
        .eq('id', user.id)
        .single()

    if (profile?.user_type !== 'admin') return null
    return user
}

export async function DELETE(request, { params }) {
    const user = await verifyAdmin(request)
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
        return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error: dbError } = await adminClient.from('jobs').delete().eq('id', id)
    if (dbError) {
        return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

// PATCH: update job status or other fields
export async function PATCH(request, { params }) {
    const adminUser = await verifyAdmin(request)
    if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 })

    let body
    try { body = await request.json() } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const allowed = ['active', 'completed', 'cancelled', 'paused']
    const { status, title, budget } = body
    const updates = {}
    if (status !== undefined) {
        if (!allowed.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        updates.status = status
    }
    if (title !== undefined) updates.title = String(title).trim()
    if (budget !== undefined) updates.budget = budget

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { error } = await adminClient.from('jobs').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
