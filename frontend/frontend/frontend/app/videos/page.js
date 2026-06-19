'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── VideoCard ──────────────────────────────────────────────────────────────
function VideoCard({ post, isLiked, onLike }) {
  const videoRef = useRef(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.6 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const isVideo = post.media_type === 'video'

  return (
    <div
      className="relative w-full flex-shrink-0 snap-start snap-always bg-black overflow-hidden h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)]"
    >
      {/* Media */}
      {isVideo ? (
        <video
          ref={videoRef}
          src={post.media_url}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          onClick={() => setMuted(m => !m)}
        />
      ) : (
        <img
          src={post.media_url}
          alt={post.caption || 'Post'}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/65 via-transparent to-black/10" />

      {/* User info + caption — bottom-left */}
      <div className="absolute bottom-20 left-4 right-20 z-10 text-white">
        <p className="font-bold text-sm drop-shadow-md">
          @{post.display_name || 'artisan'}
        </p>
        {post.caption && (
          <p className="text-sm mt-1 leading-snug text-white/90 drop-shadow line-clamp-3">
            {post.caption}
          </p>
        )}
      </div>

      {/* Side action buttons */}
      <div className="absolute right-3 bottom-24 z-10 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={onLike} className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform">
          <div className={`p-1.5 rounded-full backdrop-blur-sm ${isLiked ? 'text-red-500' : 'text-white'}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7 drop-shadow"
              fill={isLiked ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <span className="text-white text-xs font-semibold drop-shadow">{post.likes_count ?? 0}</span>
        </button>

        {/* Mute/unmute (videos only) */}
        {isVideo && (
          <button
            onClick={() => setMuted(m => !m)}
            className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            <div className="p-1.5 rounded-full text-white backdrop-blur-sm">
              {muted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072M5.636 5.636a9 9 0 000 12.728M18.364 5.636a9 9 0 010 12.728" />
                </svg>
              )}
            </div>
            <span className="text-white text-xs drop-shadow">{muted ? 'Unmute' : 'Mute'}</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────
function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)] text-white gap-4 px-6 text-center bg-black">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
      <p className="text-xl font-bold">No videos yet</p>
      <p className="text-slate-400 text-sm">Be the first to share your work!</p>
      <Link
        href="/videos/upload"
        className="mt-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
      >
        Post a video
      </Link>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function VideosPage() {
  const router = useRouter()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      setCurrentUser(user)

      // Fetch videos with poster name via FK join
      const { data: videos, error } = await supabase
        .from('videos')
        .select('id, media_url, media_type, caption, likes_count, created_at, user_id, users(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && videos) {
        const enriched = videos.map(v => ({
          ...v,
          display_name: v.users
            ? `${v.users.first_name ?? ''} ${v.users.last_name ?? ''}`.trim() || 'artisan'
            : 'artisan',
        }))
        setPosts(enriched)
      }

      // Fetch this user's likes
      if (user) {
        const { data: likes } = await supabase
          .from('video_likes')
          .select('video_id')
          .eq('user_id', user.id)
        if (likes) setLikedPosts(new Set(likes.map(l => l.video_id)))
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleLike = async (postId) => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    const isLiked = likedPosts.has(postId)

    if (isLiked) {
      await supabase.from('video_likes').delete().match({ video_id: postId, user_id: currentUser.id })
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s })
      setPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count ?? 0) - 1) } : p)
      )
    } else {
      await supabase.from('video_likes').insert({ video_id: postId, user_id: currentUser.id })
      setLikedPosts(prev => new Set([...prev, postId]))
      setPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count ?? 0) + 1 } : p)
      )
    }
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-black h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)]"
      >
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Loading videos…</p>
        </div>
      </div>
    )
  }

  if (posts.length === 0) return (
    <>
      <EmptyFeed />
      <BottomBar />
    </>
  )

  return (
    <div className="relative bg-black h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)] overflow-hidden">
      {/* Scroll-snap feed */}
      <div
        className="h-full overflow-y-scroll snap-y snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {posts.map(post => (
          <VideoCard
            key={post.id}
            post={post}
            isLiked={likedPosts.has(post.id)}
            onLike={() => handleLike(post.id)}
          />
        ))}
      </div>

      <BottomBar />
    </div>
  )
}

// ── Bottom nav bar ─────────────────────────────────────────────────────────
function BottomBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-8 py-3 bg-black/85 backdrop-blur border-t border-white/10">
      <Link
        href="/"
        className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-xs">Home</span>
      </Link>

      <Link href="/videos/upload" className="flex flex-col items-center gap-1">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/40 active:scale-95 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <span className="text-xs text-white/80">Post</span>
      </Link>
    </div>
  )
}
