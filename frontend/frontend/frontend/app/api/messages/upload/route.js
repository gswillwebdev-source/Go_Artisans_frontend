import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ACCOUNT_KEY

// POST /api/messages/upload
// Accepts multipart/form-data with a `file` field.
// Uploads to Supabase Storage bucket `chat-media` and returns the public URL.
export async function POST(request) {
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

    let formData
    try { formData = await request.formData() } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const file = formData.get('file')
    if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const MAX_MB = 50
    if (file.size > MAX_MB * 1024 * 1024) {
        return NextResponse.json({ error: `File too large (max ${MAX_MB}MB)` }, { status: 400 })
    }

    // Determine media type
    const mime = file.type || ''
    let mediaType = 'file'
    if (mime.startsWith('image/')) mediaType = 'image'
    else if (mime.startsWith('video/')) mediaType = 'video'
    else if (mime.startsWith('audio/')) mediaType = 'audio'

    // Sanitize extension
    const ext = (file.name?.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '')
    const path = `${user.id}/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const { error: uploadErr } = await admin.storage
        .from('chat-media')
        .upload(path, buffer, { contentType: mime || 'application/octet-stream', upsert: false })

    if (uploadErr) {
        console.error('[messages/upload]', uploadErr)
        return NextResponse.json({ error: uploadErr.message || 'Upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = admin.storage.from('chat-media').getPublicUrl(path)

    return NextResponse.json({ url: publicUrl, media_type: mediaType })
}
