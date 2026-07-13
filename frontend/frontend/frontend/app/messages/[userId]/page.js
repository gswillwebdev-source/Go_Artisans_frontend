'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ChatPage() {
  const router = useRouter()
  const { userId } = useParams()

  const [session, setSession] = useState(null)
  const [partner, setPartner] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadThread = useCallback(async (s) => {
    const res = await fetch(`/api/messages/${userId}`, {
      headers: { Authorization: `Bearer ${s.access_token}` },
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed to load messages')
      return
    }
    const data = await res.json()
    setPartner(data.partner)
    setMessages(data.messages ?? [])
  }, [userId])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!s) { router.replace('/login'); return }
      setSession(s)
      await loadThread(s)
      setLoading(false)
    })
  }, [router, loadThread])

  // Scroll to bottom when messages load or change
  useEffect(() => { scrollToBottom() }, [messages])

  // Subscribe to realtime new messages in this thread
  useEffect(() => {
    if (!session || !userId) return

    const channel = supabase
      .channel(`dm-${session.user.id}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `recipient_id=eq.${session.user.id}`,
        },
        (payload) => {
          const msg = payload.new
          if (msg.sender_id !== userId) return
          setMessages(prev => [...prev, msg])
          // Mark as read immediately via API
          fetch(`/api/messages/${userId}`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
          }).catch(() => {})
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [session, userId])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setError('')
    setSending(true)

    // Optimistically add the message to UI
    const optimistic = {
      id: `tmp-${Date.now()}`,
      sender_id: session.user.id,
      recipient_id: userId,
      content: text.trim(),
      is_read: false,
      created_at: new Date().toISOString(),
      _optimistic: true,
    }
    setMessages(prev => [...prev, optimistic])
    setText('')

    try {
      const res = await fetch(`/api/messages/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ content: optimistic.content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send')
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        return
      }
      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data.message : m))
    } catch {
      setError('Something went wrong. Please try again.')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  const myId = session?.user?.id

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDay(dateStr) {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  // Group messages by day
  const groupedMessages = messages.reduce((groups, msg) => {
    const day = formatDay(msg.created_at)
    if (!groups[day]) groups[day] = []
    groups[day].push(msg)
    return groups
  }, {})

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)] bg-[var(--bg-0)]">

      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white shadow-sm">
        <Link href="/messages" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center text-slate-500 font-bold text-sm shrink-0">
          {partner?.profile_picture
            ? <img src={partner.profile_picture} alt="" className="w-full h-full object-cover" />
            : partner?.first_name?.[0] ?? '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-900 truncate">
            {partner?.first_name} {partner?.last_name}
          </p>
          <p className="text-xs text-slate-400 capitalize">{partner?.user_type}</p>
        </div>
        {partner && (
          <Link href={`/workers/${partner.id}`}
            className="text-xs text-blue-600 font-semibold hover:underline shrink-0">
            View Profile
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {Object.entries(groupedMessages).map(([day, dayMsgs]) => (
          <div key={day}>
            {/* Day divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-semibold">{day}</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            {dayMsgs.map(msg => {
              const isMine = msg.sender_id === myId
              return (
                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-snug
                    ${isMine
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}
                    ${msg._optimistic ? 'opacity-70' : ''}`}>
                    <p className="break-words">{msg.content}</p>
                    <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-blue-200' : 'text-slate-400'}`}>
                      {formatTime(msg.created_at)}
                      {isMine && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-16">
            <p className="text-3xl">👋</p>
            <p className="text-slate-600 font-semibold text-sm">Say hello to {partner?.first_name}!</p>
            <p className="text-slate-400 text-xs">Start the conversation below.</p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm text-center py-4">{error}</p>}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend}
        className="shrink-0 flex items-end gap-2 px-4 py-3 border-t border-slate-200 bg-white">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
          placeholder={`Message ${partner?.first_name ?? ''}…`}
          maxLength={2000}
          rows={1}
          className="flex-1 resize-none border border-slate-300 rounded-2xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-32 overflow-y-auto"
          style={{ minHeight: '44px' }}
        />
        <button type="submit" disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white disabled:opacity-40 transition hover:bg-blue-700 active:scale-95 shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  )
}
