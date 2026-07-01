'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Gift catalog ───────────────────────────────────────────────────────────
const GIFTS = [
  { emoji: '🌹', name: 'Rose', cost: 10 },
  { emoji: '⭐', name: 'Star', cost: 50 },
  { emoji: '🏆', name: 'Trophy', cost: 100 },
  { emoji: '👑', name: 'Crown', cost: 200 },
  { emoji: '💎', name: 'Diamond', cost: 500 },
  { emoji: '🔥', name: 'Fire', cost: 30 },
  { emoji: '💯', name: '100', cost: 80 },
  { emoji: '🎉', name: 'Party', cost: 20 },
  { emoji: '🚀', name: 'Rocket', cost: 150 },
  { emoji: '❤️', name: 'Heart', cost: 15 },
]

// ── Reusable action button ─────────────────────────────────────────────────
function ActionBtn({ onClick, icon, label, count, active }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 active:scale-90 transition-transform"
    >
      <div className={`p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 ${active ? 'text-red-500' : 'text-white'}`}>
        {icon}
      </div>
      <span className="text-white text-[10px] font-semibold drop-shadow leading-none">
        {count !== undefined ? count : label}
      </span>
    </button>
  )
}

// ── VideoCard ──────────────────────────────────────────────────────────────
function VideoCard({ post, isLiked, onLike, onComment, onScrollUp, onGift, onViewed, onShare }) {
  const videoRef = useRef(null)
  const cardRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const hasTrackedViewRef = useRef(false)

  useEffect(() => {
    const target = post.media_type === 'video' ? videoRef.current : cardRef.current
    if (!target) return

    const el = videoRef.current
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (post.media_type === 'video' && el) {
            el.play().catch(() => { })
          }
          if (!hasTrackedViewRef.current && typeof onViewed === 'function') {
            hasTrackedViewRef.current = true
            onViewed(post.id)
          }
        } else {
          if (post.media_type === 'video' && el) {
            el.pause()
          }
        }
      },
      { threshold: 0.6 }
    )
    obs.observe(target)
    return () => obs.disconnect()
  }, [post.id, post.media_type, onViewed])

  const handleFullscreen = () => {
    const el = cardRef.current
    if (!el) return
    if (el.requestFullscreen) el.requestFullscreen()
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/videos`
    let didShare = false

    if (navigator.share) {
      try {
        await navigator.share({ title: `@${post.display_name} on GoArtisans`, text: post.caption || '', url })
        didShare = true
      } catch {
        didShare = false
      }
    }

    if (!didShare) {
      try {
        await navigator.clipboard.writeText(url)
        didShare = true
      } catch {
        didShare = false
      }
    }

    if (didShare && typeof onShare === 'function') {
      onShare(post.id)
    }
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = post.media_url
    a.download = `goartisans-${post.id}.${post.media_type === 'video' ? 'mp4' : 'jpg'}`
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const isVideo = post.media_type === 'video'

  return (
    <div className="flex-shrink-0 snap-start snap-always w-full flex items-center justify-center bg-black h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)] px-3">
      <div className="flex items-end gap-2 sm:gap-3 w-full" style={{ maxWidth: 420 }}>

        {/* Portrait video card */}
        <div
          ref={cardRef}
          className="relative flex-1 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/60 cursor-pointer"
          style={{ aspectRatio: '9/16', maxHeight: 'calc(100vh - 130px)' }}
        >
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
            />
          )}

          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/75 via-transparent to-transparent" />

          {/* Creator info — clickable link to their profile */}
          <div className="absolute bottom-3 left-3 right-2 z-10 text-white">
            <Link
              href={`/workers/${post.user_id}`}
              className="inline-flex items-center gap-2 mb-1 group"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-8 w-8 rounded-full overflow-hidden border-2 border-white/50 shrink-0 bg-white/20 flex items-center justify-center">
                {post.profile_picture
                  ? <img src={post.profile_picture} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-white">{(post.display_name || 'A').charAt(0).toUpperCase()}</span>}
              </div>
              <p className="font-bold text-sm drop-shadow group-hover:underline">@{post.display_name || 'artisan'}</p>
            </Link>
            {post.caption && (
              <p className="text-xs mt-0.5 text-white/85 leading-snug line-clamp-2 drop-shadow">{post.caption}</p>
            )}
            <p className="text-[11px] mt-1 text-white/90 font-semibold drop-shadow">
              {post.likes_count ?? 0} likes • {post.comments_count ?? 0} comments • {post.shares_count ?? 0} shares
            </p>
          </div>

          {isVideo && muted && (
            <div className="absolute top-3 right-3 bg-black/50 rounded-full p-1.5 text-white pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            </div>
          )}
        </div>

        {/* Side action buttons */}
        <div className="flex flex-col items-center gap-3 pb-4 shrink-0">
          <ActionBtn onClick={onScrollUp} label="Prev"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>}
          />
          <ActionBtn onClick={onLike} active={isLiked} count={post.likes_count ?? 0}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isLiked ? 'text-red-500' : ''}`} fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
          />
          <ActionBtn onClick={onComment} count={post.comments_count ?? 0}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          />
          <ActionBtn onClick={() => { }} count={post.views_count ?? 0}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
          />
          <ActionBtn onClick={handleShare} count={post.shares_count ?? 0}
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}
          />
          <ActionBtn onClick={handleDownload} label="Save"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
          />
          <ActionBtn onClick={handleFullscreen} label="Expand"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>}
          />
          <ActionBtn onClick={onGift} label="Gift"
            icon={<span className="text-xl leading-none">🎁</span>}
          />
        </div>
      </div>
    </div>
  )
}

// ── Gift Modal ─────────────────────────────────────────────────────────────
function GiftModal({ post, currentUser, coins, onClose, onSent, router }) {
  const [selected, setSelected] = useState(null)
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const [localCoins, setLocalCoins] = useState(coins)

  const handleSend = async () => {
    if (!currentUser) { router.push('/login'); return }
    if (!selected) { setErr('Pick a gift first!'); return }
    if (localCoins < selected.cost) { setErr('Not enough coins — claim your free coins below!'); return }
    if (post.user_id === currentUser.id) { setErr("You can't gift your own video."); return }
    setSending(true)
    setErr('')

    await supabase
      .from('user_coins')
      .upsert({ user_id: currentUser.id, balance: localCoins - selected.cost, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })

    const { data } = await supabase
      .from('video_gifts')
      .insert({
        video_id: post.id,
        sender_id: currentUser.id,
        recipient_id: post.user_id,
        gift_emoji: selected.emoji,
        gift_name: selected.name,
        gift_cost: selected.cost,
      })
      .select('id, gift_emoji, gift_name, gift_cost, created_at, sender:sender_id(first_name, last_name)')
      .single()

    if (data) onSent(data, selected.cost)
    setSending(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="w-full bg-[#181818] rounded-t-3xl" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3">
          <div>
            <p className="text-white font-bold text-base">Send a Gift 🎁</p>
            <p className="text-white/50 text-xs mt-0.5">
              Your balance: <span className="text-yellow-400 font-bold">{localCoins} 🪙</span>
            </p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="h-px bg-white/10 mx-5 mb-3" />
        <div className="grid grid-cols-5 gap-2 px-5 pb-3">
          {GIFTS.map(gift => (
            <button
              key={gift.name}
              onClick={() => setSelected(gift)}
              className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition border-2 ${selected?.name === gift.name
                ? 'border-yellow-400 bg-yellow-400/10'
                : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
            >
              <span className="text-2xl">{gift.emoji}</span>
              <span className="text-white text-[10px] font-semibold leading-tight">{gift.name}</span>
              <span className="text-yellow-400 text-[10px] font-bold">{gift.cost}🪙</span>
            </button>
          ))}
        </div>
        {err && <p className="text-red-400 text-xs text-center px-5 mb-2">{err}</p>}
        <div className="px-5 pb-6 flex flex-col gap-2">
          <button
            onClick={handleSend}
            disabled={!selected || sending || !currentUser}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 text-white font-bold text-sm disabled:opacity-40 transition active:scale-95"
          >
            {sending ? 'Sending…' : selected ? `Send ${selected.emoji} ${selected.name} · ${selected.cost} 🪙` : 'Select a gift above'}
          </button>
          <Link
            href="/gift-store"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition text-center"
          >
            🛍️ Buy Coins
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Comments drawer ────────────────────────────────────────────────────────
function CommentsDrawer({ post, currentUser, onClose, router, onOpenGift, onCommentAdded }) {
  const [comments, setComments] = useState([])
  const [gifts, setGifts] = useState([])
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    if (!post?.id) return
    supabase
      .from('video_comments')
      .select('id, comment, created_at, users(first_name, last_name)')
      .eq('video_id', post.id)
      .order('created_at', { ascending: true })
      .limit(50)
      .then(({ data }) => { if (data) setComments(data) })
    supabase
      .from('video_gifts')
      .select('id, gift_emoji, gift_name, gift_cost, created_at, sender:sender_id(first_name, last_name)')
      .eq('video_id', post.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setGifts(data) })
  }, [post?.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    if (!currentUser) { router.push('/login'); return }
    setSubmitting(true)
    const { data } = await supabase
      .from('video_comments')
      .insert({ video_id: post.id, user_id: currentUser.id, comment: text.trim() })
      .select('id, comment, created_at, users(first_name, last_name)')
      .single()
    if (data) {
      setComments(prev => [...prev, data])
      if (typeof onCommentAdded === 'function') {
        onCommentAdded(post.id)
      }
      setTimeout(() => listRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }), 50)
    }
    setText('')
    setSubmitting(false)
  }

  const feed = [
    ...comments.map(c => ({ ...c, _type: 'comment' })),
    ...gifts.map(g => ({ ...g, _type: 'gift' })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" onClick={onClose}>
      <div className="bg-[#181818] rounded-t-3xl flex flex-col" style={{ maxHeight: '72vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-4 pb-3">
          <p className="text-white font-bold text-sm">{post.comments_count ?? comments.length} Comments</p>
          <button onClick={onClose} className="text-white/50 hover:text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="h-px bg-white/10 mx-4" />
        <div ref={listRef} className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
          {feed.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">No comments yet. Be the first!</p>
          )}
          {feed.map(item => item._type === 'gift' ? (
            <div key={`g-${item.id}`} className="flex gap-3 items-center">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-sm shrink-0">🎁</div>
              <div className="flex-1 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl px-3 py-2 border border-yellow-400/20">
                <p className="text-white/70 text-xs font-semibold">
                  {item.sender?.first_name} {item.sender?.last_name}
                  <span className="text-yellow-400 ml-1 font-bold">gifted</span>
                </p>
                <p className="text-white text-lg mt-0.5">{item.gift_emoji} <span className="text-sm font-semibold">{item.gift_name}</span></p>
              </div>
            </div>
          ) : (
            <div key={`c-${item.id}`} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {item.users?.first_name?.charAt(0) ?? '?'}
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold">{item.users?.first_name} {item.users?.last_name}</p>
                <p className="text-white text-sm mt-0.5">{item.comment}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 px-4 py-3 border-t border-white/10">
          <input value={text} onChange={e => setText(e.target.value)}
            placeholder={currentUser ? 'Add a comment…' : 'Log in to comment'}
            disabled={!currentUser || submitting} maxLength={300}
            className="flex-1 bg-white/10 rounded-full px-4 py-2 text-sm text-white placeholder-white/40 outline-none focus:bg-white/15 transition"
          />
          <button
            type="button"
            onClick={onOpenGift}
            className="px-3 py-2 rounded-full bg-yellow-500/20 border border-yellow-400/40 text-xl hover:bg-yellow-500/30 transition shrink-0"
            title="Send a gift"
          >🎁</button>
          <button type="submit" disabled={!text.trim() || submitting}
            className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold disabled:opacity-40 transition hover:bg-blue-700 shrink-0">
            Post
          </button>
        </form>
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
      <Link href="/videos/upload" className="mt-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition">Post a video</Link>
    </div>
  )
}

// ── Bottom nav bar ─────────────────────────────────────────────────────────
function BottomBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-8 py-3 bg-black/85 backdrop-blur border-t border-white/10">
      <Link href="/" className="flex flex-col items-center gap-1 text-white/80 hover:text-white transition-colors">
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

// ── Main page ──────────────────────────────────────────────────────────────
export default function VideosPage() {
  const router = useRouter()
  const feedRef = useRef(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [currentUser, setCurrentUser] = useState(null)
  const [activeComment, setActiveComment] = useState(null)
  const [activeGift, setActiveGift] = useState(null)
  const [userCoins, setUserCoins] = useState(0)

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      setCurrentUser(user)

      const { data: videos, error } = await supabase
        .from('videos')
        .select('id, media_url, media_type, caption, likes_count, comments_count, shares_count, views_count, created_at, user_id, users(first_name, last_name, profile_picture)')
        .order('created_at', { ascending: false })
        .limit(30)

      if (!error && videos) {
        setPosts(videos.map(v => ({
          ...v,
          display_name: v.users
            ? `${v.users.first_name ?? ''} ${v.users.last_name ?? ''}`.trim() || 'artisan'
            : 'artisan',
          profile_picture: v.users?.profile_picture ?? null,
        })))
      }

      if (user) {
        const { data: likes } = await supabase.from('video_likes').select('video_id').eq('user_id', user.id)
        if (likes) setLikedPosts(new Set(likes.map(l => l.video_id)))

        const { data: coinsRow } = await supabase.from('user_coins').select('balance').eq('user_id', user.id).single()
        setUserCoins(coinsRow?.balance ?? 0)
      }

      setLoading(false)
    }
    init()
  }, [])

  const handleLike = async (postId) => {
    if (!currentUser) { router.push('/login'); return }
    const isLiked = likedPosts.has(postId)
    if (isLiked) {
      const { error } = await supabase.from('video_likes').delete().match({ video_id: postId, user_id: currentUser.id })
      if (error) return
      setLikedPosts(prev => { const s = new Set(prev); s.delete(postId); return s })
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: Math.max(0, (p.likes_count ?? 0) - 1) } : p))
    } else {
      const { error } = await supabase.from('video_likes').insert({ video_id: postId, user_id: currentUser.id })
      if (error) return
      setLikedPosts(prev => new Set([...prev, postId]))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: (p.likes_count ?? 0) + 1 } : p))
    }
  }

  const handleCommentAdded = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count ?? 0) + 1 } : p))
    setActiveComment(prev => prev && prev.id === postId
      ? { ...prev, comments_count: (prev.comments_count ?? 0) + 1 }
      : prev)
  }

  const handleShare = async (postId) => {
    // Increment local count regardless of auth — the VideoCard already did the clipboard/native share
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares_count: (p.shares_count ?? 0) + 1 } : p))

    // Only persist to DB for authenticated users
    if (!currentUser) return

    await supabase
      .from('video_shares')
      .insert({ video_id: postId, user_id: currentUser.id })
  }

  const handleViewed = async (postId) => {
    if (!currentUser) return
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const accessToken = session?.access_token
    if (!accessToken) return

    try {
      const response = await fetch('/api/videos/view', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ videoId: postId }),
      })

      if (!response.ok) return

      const payload = await response.json()
      const nextCount = Number(payload?.viewsCount)

      if (Number.isFinite(nextCount)) {
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, views_count: nextCount } : p))
      }
    } catch {
      // Keep feed usable even if telemetry call fails.
    }
  }

  const scrollFeedUp = () => {
    feedRef.current?.scrollBy({ top: -(feedRef.current.clientHeight), behavior: 'smooth' })
  }

  if (loading) return (
    <div className="flex items-center justify-center bg-black h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)]">
      <div className="flex flex-col items-center gap-3 text-white">
        <div className="h-8 w-8 rounded-full border-2 border-white border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  )

  if (posts.length === 0) return <><EmptyFeed /><BottomBar /></>

  return (
    <div className="relative bg-black h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)] overflow-hidden">
      <div ref={feedRef} className="h-full overflow-y-scroll snap-y snap-mandatory" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {posts.map(post => (
          <VideoCard
            key={post.id}
            post={post}
            isLiked={likedPosts.has(post.id)}
            onLike={() => handleLike(post.id)}
            onComment={() => { setActiveGift(null); setActiveComment(post) }}
            onScrollUp={scrollFeedUp}
            onGift={() => { setActiveComment(null); setActiveGift(post) }}
            onViewed={handleViewed}
            onShare={handleShare}
          />
        ))}
      </div>
      <BottomBar />
      {activeComment && (
        <CommentsDrawer
          post={activeComment}
          currentUser={currentUser}
          onClose={() => setActiveComment(null)}
          router={router}
          onOpenGift={() => { setActiveComment(null); setActiveGift(activeComment) }}
          onCommentAdded={handleCommentAdded}
        />
      )}
      {activeGift && (
        <GiftModal
          post={activeGift}
          currentUser={currentUser}
          coins={userCoins}
          onClose={() => setActiveGift(null)}
          router={router}
          onSent={(_gift, cost) => setUserCoins(prev => prev - cost)}
        />
      )}
    </div>
  )
}
