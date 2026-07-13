'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function MessagesPage() {
  const router = useRouter()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [broadcasts, setBroadcasts] = useState([])
  const [tab, setTab] = useState('chats') // 'chats' | 'activity'
  const [unreadDms, setUnreadDms] = useState(0)
  const [unreadBroadcasts, setUnreadBroadcasts] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!s) { router.replace('/login?redirect=/messages'); return }
      setSession(s)
      await Promise.all([loadConversations(s), loadBroadcasts(s)])
      setLoading(false)
    })
  }, [router])

  async function loadConversations(s) {
    const res = await fetch('/api/messages', {
      headers: { Authorization: `Bearer ${s.access_token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    setConversations(data.conversations ?? [])
    setUnreadDms(data.unread_count ?? 0)
  }

  async function loadBroadcasts(s) {
    const res = await fetch('/api/notifications/broadcasts', {
      headers: { Authorization: `Bearer ${s.access_token}` },
    })
    if (!res.ok) return
    const data = await res.json()
    setBroadcasts(data.broadcasts ?? [])
    setUnreadBroadcasts(data.unread_count ?? 0)
  }

  async function markBroadcastsRead(ids) {
    if (!session || ids.length === 0) return
    await fetch('/api/notifications/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ids }),
    })
    setBroadcasts(prev => prev.map(b => ids.includes(b.id) ? { ...b, is_read: true } : b))
    setUnreadBroadcasts(0)
  }

  const BROADCAST_ICONS = { new_video: '🎬', new_job: '💼', daily_digest: '☀️' }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-0)]">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">Notifications & Chat</h1>
            <Link href="/messages/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">
              ✏️ New Chat
            </Link>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mt-3">
            <button onClick={() => setTab('chats')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5
                ${tab === 'chats' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              💬 Messages
              {unreadDms > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadDms}</span>
              )}
            </button>
            <button onClick={() => { setTab('activity'); const ids = broadcasts.filter(b => !b.is_read).map(b => b.id); markBroadcastsRead(ids) }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5
                ${tab === 'activity' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              📣 Activity
              {unreadBroadcasts > 0 && tab !== 'activity' && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadBroadcasts}</span>
              )}
            </button>
          </div>
        </div>

        {/* ── CHATS TAB ────────────────────────────────────────── */}
        {tab === 'chats' && (
          <div>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-slate-600 font-semibold">No conversations yet</p>
                <p className="text-slate-400 text-sm mt-1">Start a chat with any artisan or client</p>
                <Link href="/messages/new"
                  className="mt-5 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition">
                  Start a conversation
                </Link>
              </div>
            ) : (
              <div>
                {conversations.map(conv => (
                  <Link key={conv.partner?.id} href={`/messages/${conv.partner?.id}`}
                    className={`flex items-center gap-3 px-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition ${conv.unread ? 'bg-blue-50/50' : ''}`}>
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-bold">
                        {conv.partner?.profile_picture
                          ? <img src={conv.partner.profile_picture} alt="" className="w-full h-full object-cover" />
                          : (conv.partner?.first_name?.[0] ?? '?')}
                      </div>
                      {conv.unread && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${conv.unread ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {conv.partner?.first_name} {conv.partner?.last_name}
                        </p>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">{timeAgo(conv.last_at)}</span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${conv.unread ? 'text-slate-700 font-semibold' : 'text-slate-400'}`}>
                        {conv.last_message}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY TAB ─────────────────────────────────────── */}
        {tab === 'activity' && (
          <div>
            {broadcasts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <p className="text-4xl mb-3">📣</p>
                <p className="text-slate-600 font-semibold">No activity yet</p>
                <p className="text-slate-400 text-sm mt-1">Posts, jobs, and daily updates will appear here</p>
              </div>
            ) : (
              <div>
                {broadcasts.map(b => (
                  <Link key={b.id} href={b.action_url || '/'}
                    className={`flex items-start gap-3 px-4 py-4 border-b border-slate-100 hover:bg-slate-50 transition ${!b.is_read ? 'bg-blue-50/40' : ''}`}>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl shrink-0">
                      {b.actor?.profile_picture
                        ? <img src={b.actor.profile_picture} alt="" className="w-full h-full object-cover rounded-xl" />
                        : BROADCAST_ICONS[b.type] ?? '📣'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!b.is_read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {b.title}
                      </p>
                      {b.body && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{b.body}</p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(b.created_at)}</p>
                    </div>
                    {!b.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
