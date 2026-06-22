'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`rounded-2xl border p-5 flex items-start gap-4 bg-white shadow-sm ${color}`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Video row ──────────────────────────────────────────────────────────────
function VideoRow({ post, onDelete }) {
  const isVideo = post.media_type === 'video'
  const date = new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white border border-slate-100 hover:border-slate-200 transition shadow-sm">
      {/* Thumbnail */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 relative">
        {isVideo ? (
          <>
            <video src={post.media_url} className="w-full h-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </>
        ) : (
          <img src={post.media_url} alt={post.caption || 'Post'} className="w-full h-full object-cover" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm truncate">{post.caption || '(No caption)'}</p>
        <p className="text-xs text-slate-500 mt-0.5">{isVideo ? '🎬 Video' : '🖼 Image'} · {date}</p>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-center shrink-0">
        <div>
          <p className="text-lg font-bold text-slate-800">{post.views_count ?? 0}</p>
          <p className="text-xs text-slate-500">Views</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-500">{post.likes_count ?? 0}</p>
          <p className="text-xs text-slate-500">Likes</p>
        </div>
        <div>
          <p className="text-lg font-bold text-blue-500">{post.comments_count ?? 0}</p>
          <p className="text-xs text-slate-500">Comments</p>
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(post.id)}
        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition shrink-0"
        title="Delete post"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CreatorDashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(null)
  const [giftsReceived, setGiftsReceived] = useState([])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setUser(session.user)

      const { data } = await supabase
        .from('videos')
        .select('id, media_url, media_type, caption, likes_count, comments_count, views_count, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (data) setPosts(data)
      const { data: gifts } = await supabase
        .from('video_gifts')
        .select('gift_cost')
        .eq('recipient_id', session.user.id)
      if (gifts) setGiftsReceived(gifts)
      setLoading(false)
    }
    init()
  }, [])

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post? This cannot be undone.')) return
    setDeleting(postId)
    await supabase.from('videos').delete().eq('id', postId).eq('user_id', user.id)
    setPosts(prev => prev.filter(p => p.id !== postId))
    setDeleting(null)
  }

  const totalViews = posts.reduce((s, p) => s + (p.views_count ?? 0), 0)
  const totalLikes = posts.reduce((s, p) => s + (p.likes_count ?? 0), 0)
  const totalComments = posts.reduce((s, p) => s + (p.comments_count ?? 0), 0)
  const totalGiftCoins = giftsReceived.reduce((s, g) => s + (g.gift_cost ?? 0), 0)

  const backHref = typeof window !== 'undefined'
    ? (document.referrer.includes('/client-profile') ? '/client-profile' : '/worker-profile')
    : '/worker-profile'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-0)]">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-0)] py-8 px-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/worker-profile" className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition-colors" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--ink-900)]">Creator Dashboard</h1>
            <p className="text-sm text-[var(--ink-500)] mt-0.5">Your video &amp; photo performance overview</p>
          </div>
          <Link
            href="/videos/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Post
          </Link>
          <Link href="/gift-box" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-semibold text-sm hover:from-yellow-500 hover:to-orange-600 transition">
            🎁 Gift Box
          </Link>
        </div>

        {/* Stats overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon="🎬" label="Total Posts" value={posts.length} sub="Videos &amp; photos" color="border-slate-200" />
          <StatCard icon="👁" label="Total Views" value={totalViews} sub="All time" color="border-slate-200" />
          <StatCard icon="❤️" label="Total Likes" value={totalLikes} sub="All time" color="border-rose-100" />
          <StatCard icon="💬" label="Total Comments" value={totalComments} sub="All time" color="border-blue-100" />
        </div>

        {/* Gift earnings card */}
        {totalGiftCoins > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 p-5 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">🎁 Gift Earnings</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{totalGiftCoins.toLocaleString()} coins</p>
              <p className="text-sm text-slate-600 mt-0.5">≈ {(totalGiftCoins * 3).toLocaleString()} XOF estimated payout</p>
            </div>
            <Link href="/gift-box?tab=withdraw" className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:from-violet-700 hover:to-purple-700 transition">
              💸 Withdraw
            </Link>
          </div>
        )}

        {/* Posts table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[var(--ink-900)]">Your Posts</h2>
            <Link href="/videos" className="text-sm text-blue-600 hover:underline">View feed →</Link>
          </div>

          {posts.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-white border border-slate-100">
              <p className="text-4xl mb-3">🎬</p>
              <p className="font-semibold text-slate-700">No posts yet</p>
              <p className="text-sm text-slate-500 mt-1 mb-4">Share your first video or photo to start building your audience.</p>
              <Link href="/videos/upload" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition">
                Post your first video
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {posts.map(post => (
                <div key={post.id} className={deleting === post.id ? 'opacity-40 pointer-events-none' : ''}>
                  <VideoRow post={post} onDelete={handleDelete} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-post breakdown (visible on mobile for the hidden stats) */}
        {posts.length > 0 && (
          <div className="sm:hidden space-y-2">
            <h2 className="font-bold text-[var(--ink-900)]">Post Stats</h2>
            {posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl border border-slate-100 p-3">
                <p className="text-xs font-semibold text-slate-700 truncate mb-2">{post.caption || '(No caption)'}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded-lg py-1.5">
                    <p className="text-base font-bold text-slate-800">{post.views_count ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Views</p>
                  </div>
                  <div className="bg-rose-50 rounded-lg py-1.5">
                    <p className="text-base font-bold text-red-500">{post.likes_count ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Likes</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg py-1.5">
                    <p className="text-base font-bold text-blue-500">{post.comments_count ?? 0}</p>
                    <p className="text-[10px] text-slate-500">Comments</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
