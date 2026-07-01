import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qgofshosxvunqbbycwyq.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

function getAdminClient() {
  if (!supabaseServiceKey) return null
  return createClient(supabaseUrl, supabaseServiceKey)
}

async function getAuthUser(request, adminClient) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token)

  if (error || !user) return null
  return user
}

export async function POST(request) {
  try {
    const adminClient = getAdminClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Supabase service key is missing' }, { status: 500 })
    }

    const user = await getAuthUser(request, adminClient)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const videoId = body?.videoId

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
    }

    let counted = true
    const { error: insertError } = await adminClient
      .from('video_views')
      .insert({ video_id: videoId, user_id: user.id })

    if (insertError) {
      if (insertError.code === '23505') {
        counted = false
      } else {
        return NextResponse.json(
          { error: 'Failed to record video view', details: insertError.message },
          { status: 500 }
        )
      }
    }

    const { data: videoRow, error: videoError } = await adminClient
      .from('videos')
      .select('views_count')
      .eq('id', videoId)
      .maybeSingle()

    if (videoError) {
      return NextResponse.json(
        { error: 'View recorded, but failed to fetch updated count', details: videoError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      counted,
      viewsCount: videoRow?.views_count ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Unexpected error while recording view', details: error?.message || 'unknown' },
      { status: 500 }
    )
  }
}
