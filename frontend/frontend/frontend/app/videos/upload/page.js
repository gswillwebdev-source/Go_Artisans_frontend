'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const MAX_VIDEO_MB = 100
const MAX_IMAGE_MB = 10

export default function UploadPage() {
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null) // { url, type }
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setUser(session.user)
        setChecking(false)
      }
    })
  }, [router])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setError('')

    const isVideo = f.type.startsWith('video/')
    const isImage = f.type.startsWith('image/')

    if (!isVideo && !isImage) {
      setError('Please select a video or image file.')
      return
    }

    const maxMB = isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB
    if (f.size > maxMB * 1024 * 1024) {
      setError(`File too large. Max size is ${maxMB}MB for ${isVideo ? 'videos' : 'images'}.`)
      return
    }

    setFile(f)
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview({ url: URL.createObjectURL(f), type: isVideo ? 'video' : 'image' })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) {
      const dt = new DataTransfer()
      dt.items.add(f)
      fileInputRef.current.files = dt.files
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return
    setUploading(true)
    setError('')
    setProgress(10)

    const ext = file.name.split('.').pop().toLowerCase()
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '')
    const filename = `${user.id}/${Date.now()}.${safeExt}`

    setProgress(30)
    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(filename, file, { upsert: false, contentType: file.type })

    if (uploadError) {
      setError('Upload failed: ' + (uploadError.message || 'Please try again.'))
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(70)
    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(filename)

    const { error: insertError } = await supabase.from('videos').insert({
      user_id: user.id,
      media_url: publicUrl,
      media_type: file.type.startsWith('video/') ? 'video' : 'image',
      caption: caption.trim() || null,
      likes_count: 0,
    })

    if (insertError) {
      setError('Failed to save post: ' + (insertError.message || 'Please try again.'))
      setUploading(false)
      setProgress(0)
      return
    }

    setProgress(100)
    router.push('/videos')
  }

  const clearFile = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setFile(null)
    setPreview(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-0)] py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/videos"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label="Back to videos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--ink-900)]">New Post</h1>
        </div>

        <div className="glass-surface rounded-2xl border border-white/80 p-6 space-y-5">
          {/* File drop zone */}
          {!preview ? (
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              role="button"
              aria-label="Click or drag to upload a video or image"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-[var(--ink-900)]">Upload a video or photo</p>
                  <p className="text-sm text-[var(--ink-500)] mt-1">
                    Drag & drop or click to browse
                  </p>
                  <p className="text-xs text-[var(--ink-500)] mt-1">
                    Videos up to {MAX_VIDEO_MB}MB · Images up to {MAX_IMAGE_MB}MB
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            /* Preview */
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-80">
              {preview.type === 'video' ? (
                <video
                  src={preview.url}
                  className="w-full h-full object-contain"
                  controls
                  muted
                />
              ) : (
                <img
                  src={preview.url}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )}
              <button
                onClick={clearFile}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                aria-label="Remove file"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Caption */}
          <div>
            <label htmlFor="caption" className="block text-sm font-semibold text-[var(--ink-700)] mb-1.5">
              Caption <span className="font-normal text-[var(--ink-500)]">(optional)</span>
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe your work…"
              rows={3}
              maxLength={300}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[var(--ink-900)] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none text-sm transition"
            />
            <p className="text-xs text-[var(--ink-500)] text-right mt-1">{caption.length}/300</p>
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Upload progress */}
          {uploading && progress < 100 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-[var(--ink-500)]">
                <span>Uploading…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Post button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Posting…
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Post to Feed
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
