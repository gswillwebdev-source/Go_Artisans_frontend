'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ── Notification sound (Web Audio API — no external file needed) ────────
function playNotificationSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(880, ctx.currentTime)
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
    } catch { /* silently ignore */ }
}

// ── Browser OS notification ────────────────────────────────────
function showBrowserNotification(senderName, body) {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    if (document.hasFocus()) return
    try {
        const n = new Notification(`💬 ${senderName}`, {
            body: body?.slice(0, 120) || '📎 Media',
            icon: '/app_icon.png',
            badge: '/app_icon.png',
            tag: 'goartisans-chat',
            vibrate: [200, 100, 200],
        })
        n.onclick = () => { window.focus(); n.close() }
        setTimeout(() => n.close(), 5000)
    } catch { /* Notification API not available */ }
}

// ── Register service worker once ───────────────────────────────
async function registerSW() {
    if ('serviceWorker' in navigator) {
        try { await navigator.serviceWorker.register('/sw.js') } catch { /* optional */ }
    }
}

// ── Dedup-merge helper ────────────────────────────────────────────────
function mergeMessages(prev, incoming) {
    if (!incoming?.length) return prev
    const ids = new Set(prev.map(m => m.id))
    const fresh = incoming.filter(m => !ids.has(m.id))
    if (!fresh.length) return prev
    return [...prev, ...fresh].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

export default function ChatPage() {
    const router = useRouter()
    const { userId } = useParams()

    const [session, setSession]             = useState(null)
    const [partner, setPartner]             = useState(null)
    const [messages, setMessages]           = useState([])
    const [loading, setLoading]             = useState(true)
    const [text, setText]                   = useState('')
    const [sending, setSending]             = useState(false)
    const [error, setError]                 = useState('')
    const [showAttachMenu, setShowAttachMenu] = useState(false)
    const [recording, setRecording]         = useState(false)
    const [recordSecs, setRecordSecs]       = useState(0)
    const [uploadingMedia, setUploadingMedia] = useState(false)

    const bottomRef       = useRef(null)
    const channelRef      = useRef(null)
    const latestTsRef     = useRef(null)
    const recorderRef     = useRef(null)
    const audioChunksRef  = useRef([])
    const recTimerRef     = useRef(null)
    const fileInputRef    = useRef(null)
    const cameraInputRef  = useRef(null)

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    // ── Add incoming messages + sound/notification ──────────────────
    const addIncoming = useCallback((incoming, token, partnerName) => {
        setMessages(prev => {
            const merged = mergeMessages(prev, incoming)
            if (merged !== prev) {
                const fromPartner = incoming.filter(m => m.sender_id === userId)
                if (fromPartner.length) {
                    playNotificationSound()
                    showBrowserNotification(partnerName || 'Message',
                        fromPartner[fromPartner.length - 1].content)
                }
            }
            return merged
        })
        if (incoming?.some(m => m.sender_id === userId)) {
            fetch(`/api/messages/${userId}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {})
        }
    }, [userId])

    // ── Load thread ───────────────────────────────────────────────────────
    const loadThread = useCallback(async (s) => {
        const res = await fetch(`/api/messages/${userId}`, {
            headers: { Authorization: `Bearer ${s.access_token}` },
        })
        if (!res.ok) { setError('Failed to load messages'); return }
        const data = await res.json()
        setPartner(data.partner)
        const msgs = data.messages ?? []
        setMessages(msgs)
        if (msgs.length) latestTsRef.current = msgs[msgs.length - 1].created_at
    }, [userId])

    // ── Init ────────────────────────────────────────────────────────────────
    useEffect(() => {
        registerSW()
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
            Notification.requestPermission()
        }
        supabase.auth.getSession().then(async ({ data: { session: s } }) => {
            if (!s) { router.replace('/login'); return }
            setSession(s)
            await loadThread(s)
            setLoading(false)
        })
    }, [router, loadThread])

    useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

    // ── Realtime: Broadcast (primary) + postgres_changes (backup) ──────
    useEffect(() => {
        if (!session || !userId) return
        const canonicalId = [session.user.id, userId].sort().join('-')
        const channel = supabase
            .channel(`chat-${canonicalId}`, { config: { broadcast: { self: false } } })
            .on('broadcast', { event: 'dm' }, ({ payload }) => {
                const msg = payload?.message
                if (msg) addIncoming([msg], session.access_token, partner?.first_name)
            })
            .on('postgres_changes', {
                event: 'INSERT', schema: 'public', table: 'direct_messages',
                filter: `recipient_id=eq.${session.user.id}`,
            }, (payload) => {
                if (payload.new.sender_id !== userId) return
                addIncoming([payload.new], session.access_token, partner?.first_name)
            })
            .subscribe()
        channelRef.current = channel
        return () => { supabase.removeChannel(channel); channelRef.current = null }
    }, [session, userId, addIncoming, partner?.first_name])

    // ── Polling fallback every 5 s ──────────────────────────────────
    useEffect(() => {
        if (!session || !userId) return
        const iv = setInterval(async () => {
            const since = latestTsRef.current
            if (!since) return
            try {
                const res = await fetch(
                    `/api/messages/${userId}?since=${encodeURIComponent(since)}`,
                    { headers: { Authorization: `Bearer ${session.access_token}` } }
                )
                if (!res.ok) return
                const data = await res.json()
                if (!data.new_messages?.length) return
                addIncoming(data.new_messages, session.access_token, partner?.first_name)
                const real = data.new_messages.filter(m => !m._optimistic)
                if (real.length) latestTsRef.current = real[real.length - 1].created_at
            } catch {}
        }, 5000)
        return () => clearInterval(iv)
    }, [session, userId, addIncoming, partner?.first_name])

    // ── Upload media then send ───────────────────────────────────────
    async function uploadAndSend(file) {
        if (!file || !session) return
        setUploadingMedia(true)
        setShowAttachMenu(false)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const up = await fetch('/api/messages/upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
                body: fd,
            })
            const upData = await up.json()
            if (!up.ok) { setError(upData.error || 'Upload failed'); return }
            await sendMessage('', upData.url, upData.media_type)
        } finally { setUploadingMedia(false) }
    }

    // ── Core send (text or media) ───────────────────────────────────
    async function sendMessage(content, mediaUrl = null, mediaType = null) {
        if (!content?.trim() && !mediaUrl) return
        const body = { content: content?.trim() || '' }
        if (mediaUrl) { body.media_url = mediaUrl; body.media_type = mediaType }

        const optimistic = {
            id: `tmp-${Date.now()}`,
            sender_id: session.user.id,
            recipient_id: userId,
            content: body.content,
            media_url: mediaUrl,
            media_type: mediaType,
            is_read: false,
            created_at: new Date().toISOString(),
            _optimistic: true,
        }
        setMessages(prev => [...prev, optimistic])

        try {
            const res = await fetch(`/api/messages/${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify(body),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Failed to send'); setMessages(prev => prev.filter(m => m.id !== optimistic.id)); return }
            const real = data.message
            setMessages(prev => prev.map(m => m.id === optimistic.id ? real : m))
            latestTsRef.current = real.created_at
            channelRef.current?.send({ type: 'broadcast', event: 'dm', payload: { message: real } }).catch(() => {})
        } catch {
            setError('Send failed. Try again.')
            setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        }
    }

    async function handleSend(e) {
        e.preventDefault()
        if (!text.trim() || sending) return
        setSending(true)
        const content = text.trim()
        setText('')
        await sendMessage(content)
        setSending(false)
    }

    // ── Voice recording ────────────────────────────────────────────
    async function startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            audioChunksRef.current = []
            const recorder = new MediaRecorder(stream)
            recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop())
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                await uploadAndSend(new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' }))
                setRecordSecs(0)
            }
            recorder.start()
            recorderRef.current = recorder
            setRecording(true)
            recTimerRef.current = setInterval(() => setRecordSecs(s => s + 1), 1000)
        } catch { setError('Microphone access denied') }
    }

    function stopRecording() {
        clearInterval(recTimerRef.current)
        setRecording(false)
        recorderRef.current?.stop()
    }

    function cancelRecording() {
        clearInterval(recTimerRef.current)
        setRecording(false)
        setRecordSecs(0)
        if (recorderRef.current?.state === 'recording') {
            recorderRef.current.ondataavailable = () => {}
            recorderRef.current.onstop = () => {}
            recorderRef.current.stop()
        }
    }

    const myId = session?.user?.id

    const fmt = (dateStr) => new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const fmtDay = (dateStr) => {
        const d = new Date(dateStr), today = new Date(), yest = new Date(today)
        yest.setDate(today.getDate() - 1)
        if (d.toDateString() === today.toDateString()) return 'Today'
        if (d.toDateString() === yest.toDateString()) return 'Yesterday'
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    }

    const grouped = messages.reduce((g, msg) => {
        const day = fmtDay(msg.created_at)
        if (!g[day]) g[day] = []
        g[day].push(msg)
        return g
    }, {})

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-[#ECE5DD]">
            <div className="h-8 w-8 rounded-full border-2 border-[#25D366] border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="flex flex-col h-[calc(100vh-48px)] sm:h-[calc(100vh-64px)] bg-[#ECE5DD]">

            {/* ── Header ────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 bg-[#075E54] shadow-md z-10">
                <Link href="/messages" className="text-white/70 hover:text-white p-1 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div className="w-9 h-9 rounded-full bg-[#128C7E] overflow-hidden flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {partner?.profile_picture
                        ? <img src={partner.profile_picture} alt="" className="w-full h-full object-cover" />
                        : partner?.first_name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-white truncate">{partner?.first_name} {partner?.last_name}</p>
                    <p className="text-[11px] text-white/60 capitalize">{partner?.user_type}</p>
                </div>
                <button onClick={() => alert('📞 Voice calls coming soon!')}
                    className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition" title="Voice call">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                </button>
                <button onClick={() => alert('📹 Video calls coming soon!')}
                    className="p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition" title="Video call">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>

            {/* ── Messages ──────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
                {Object.entries(grouped).map(([day, dayMsgs]) => (
                    <div key={day}>
                        <div className="flex justify-center my-3">
                            <span className="bg-[#d2e8d4]/95 text-[#075E54] text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
                                {day}
                            </span>
                        </div>
                        {dayMsgs.map(msg => {
                            const isMine = msg.sender_id === myId
                            return (
                                <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                                    <div className={`max-w-[78%] rounded-2xl px-3 pt-2 pb-1.5 shadow-sm
                                        ${isMine ? 'bg-[#DCF8C6] rounded-tr-sm' : 'bg-white rounded-tl-sm'}
                                        ${msg._optimistic ? 'opacity-60' : ''}`}>
                                        {msg.media_type === 'image' && msg.media_url && (
                                            <a href={msg.media_url} target="_blank" rel="noopener noreferrer">
                                                <img src={msg.media_url} alt="Image"
                                                    className="rounded-xl max-w-[240px] w-full object-cover mb-1 cursor-zoom-in"
                                                    style={{ maxHeight: 280 }} />
                                            </a>
                                        )}
                                        {msg.media_type === 'video' && msg.media_url && (
                                            <video src={msg.media_url} controls
                                                className="rounded-xl max-w-[240px] w-full mb-1"
                                                style={{ maxHeight: 280 }} />
                                        )}
                                        {msg.media_type === 'audio' && msg.media_url && (
                                            <div className="flex items-center gap-2 mb-1 min-w-[180px]">
                                                <span className="text-[#075E54] text-lg">🎤</span>
                                                <audio src={msg.media_url} controls className="flex-1 h-8" />
                                            </div>
                                        )}
                                        {msg.content ? (
                                            <p className="text-[14px] text-slate-900 leading-snug break-words">{msg.content}</p>
                                        ) : null}
                                        <p className="text-[10px] mt-0.5 text-right text-slate-400 leading-none">
                                            {fmt(msg.created_at)}
                                            {isMine && (
                                                <span className={`ml-1 ${msg.is_read ? 'text-[#53BDEB]' : ''}`}>
                                                    {msg._optimistic ? '⏳' : msg.is_read ? '✓✓' : '✓'}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ))}

                {messages.length === 0 && !error && (
                    <div className="flex flex-col items-center justify-center h-full py-16 gap-2 text-center">
                        <div className="w-16 h-16 rounded-full bg-[#075E54]/10 flex items-center justify-center text-3xl">💬</div>
                        <p className="text-slate-600 font-semibold text-sm">No messages yet</p>
                        <p className="text-slate-400 text-xs">Send a message to start chatting with {partner?.first_name}</p>
                    </div>
                )}
                {error && <p className="text-red-500 text-sm text-center py-2 bg-red-50 rounded-xl px-3">{error}</p>}
                {uploadingMedia && (
                    <div className="flex justify-center">
                        <span className="bg-white text-xs text-slate-500 px-3 py-1.5 rounded-full shadow-sm">Uploading…</span>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* ── Attach menu ──────────────────────────────────────── */}
            {showAttachMenu && (
                <div className="shrink-0 flex items-center gap-3 px-4 py-3 bg-white border-t border-slate-200 overflow-x-auto">
                    {[
                        { label: 'Camera', icon: '📷', fn: () => { setShowAttachMenu(false); cameraInputRef.current?.click() } },
                        { label: 'Image',  icon: '🖼️', fn: () => { setShowAttachMenu(false); if (fileInputRef.current) { fileInputRef.current.accept = 'image/*'; fileInputRef.current.click() } } },
                        { label: 'Video',  icon: '🎥', fn: () => { setShowAttachMenu(false); if (fileInputRef.current) { fileInputRef.current.accept = 'video/*'; fileInputRef.current.click() } } },
                        { label: 'File',   icon: '📄', fn: () => { setShowAttachMenu(false); if (fileInputRef.current) { fileInputRef.current.accept = '*/*'; fileInputRef.current.click() } } },
                    ].map(a => (
                        <button key={a.label} onClick={a.fn}
                            className="flex flex-col items-center gap-1 shrink-0 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition">
                            <span className="text-2xl">{a.icon}</span>
                            <span className="text-xs font-semibold">{a.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Input bar ───────────────────────────────────────── */}
            <div className="shrink-0 flex items-end gap-2 px-3 py-2 bg-[#F0F0F0]">
                {/* Attach */}
                <button onClick={() => setShowAttachMenu(m => !m)}
                    className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition
                        ${showAttachMenu ? 'bg-[#075E54] text-white' : 'bg-white text-slate-500 hover:bg-slate-200'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                </button>

                {/* Recording indicator */}
                {recording ? (
                    <div className="flex-1 flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 border-2 border-red-400">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span className="text-sm text-slate-700 flex-1">Recording {recordSecs}s…</span>
                        <button onClick={cancelRecording} className="text-xs text-red-500 font-bold hover:underline">Cancel</button>
                    </div>
                ) : (
                    /* Text input */
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
                        placeholder={`Message ${partner?.first_name ?? ''}…`}
                        maxLength={2000}
                        rows={1}
                        className="flex-1 resize-none bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#25D366] max-h-28 overflow-y-auto"
                        style={{ minHeight: 40 }}
                    />
                )}

                {/* Send or Mic */}
                {(text.trim() || recording) ? (
                    <button
                        onClick={recording ? stopRecording : handleSend}
                        disabled={!recording && (!text.trim() || sending)}
                        className="shrink-0 w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white disabled:opacity-40 transition hover:bg-[#1DB954] active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                        </svg>
                    </button>
                ) : (
                    <button
                        onMouseDown={startRecording} onMouseUp={stopRecording}
                        onTouchStart={startRecording} onTouchEnd={stopRecording}
                        className="shrink-0 w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white transition hover:bg-[#1DB954] active:scale-95 active:bg-red-500"
                        title="Hold to record voice">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = '' }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadAndSend(f); e.target.value = '' }} />
        </div>
    )
}
    const existingIds = new Set(prev.map(m => m.id))
    const fresh = incoming.filter(m => !existingIds.has(m.id))
    if (!fresh.length) return prev
    return [...prev, ...fresh].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

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

    // Keep a ref to the shared broadcast channel so handleSend can use it
    const channelRef = useRef(null)
    // Track latest real message timestamp for polling
    const latestTsRef = useRef(null)

    const scrollToBottom = useCallback(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [])

    const addIncoming = useCallback((incoming, token) => {
        setMessages(prev => mergeMessages(prev, incoming))
        // Mark as read via lightweight PATCH
        if (incoming?.some(m => m.sender_id === userId)) {
            fetch(`/api/messages/${userId}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            }).catch(() => { })
        }
    }, [userId])

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
        const msgs = data.messages ?? []
        setMessages(msgs)
        // Track latest timestamp for polling
        if (msgs.length > 0) latestTsRef.current = msgs[msgs.length - 1].created_at
    }, [userId])

    // ── Auth + initial load ──────────────────────────────────────────────
    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session: s } }) => {
            if (!s) { router.replace('/login'); return }
            setSession(s)
            await loadThread(s)
            setLoading(false)
        })
    }, [router, loadThread])

    // ── Scroll to bottom on new messages ────────────────────────────────
    useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

    // ── Realtime: Broadcast + postgres_changes ──────────────────────────
    useEffect(() => {
        if (!session || !userId) return

        // Canonical channel name: sorted IDs ensure BOTH users join the same channel
        // regardless of who opened the chat first.
        const canonicalId = [session.user.id, userId].sort().join('-')

        const channel = supabase
            .channel(`chat-${canonicalId}`, {
                config: { broadcast: { self: false } }, // don't echo our own broadcasts back
            })
            // ① Broadcast (primary — works instantly, no SQL setup required)
            .on('broadcast', { event: 'dm' }, ({ payload }) => {
                const msg = payload?.message
                if (!msg) return
                addIncoming([msg], session.access_token)
            })
            // ② postgres_changes (backup — works once SQL migration is run)
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
                    addIncoming([msg], session.access_token)
                }
            )
            .subscribe()

        channelRef.current = channel
        return () => {
            supabase.removeChannel(channel)
            channelRef.current = null
        }
    }, [session, userId, addIncoming])

    // ── Polling fallback every 5 s (catches missed broadcasts/changes) ───
    useEffect(() => {
        if (!session || !userId) return
        const interval = setInterval(async () => {
            const since = latestTsRef.current
            if (!since) return
            try {
                const res = await fetch(
                    `/api/messages/${userId}?since=${encodeURIComponent(since)}`,
                    { headers: { Authorization: `Bearer ${session.access_token}` } }
                )
                if (!res.ok) return
                const data = await res.json()
                if (!data.new_messages?.length) return
                setMessages(prev => {
                    const merged = mergeMessages(prev, data.new_messages)
                    if (merged !== prev) {
                        const real = merged.filter(m => !m._optimistic)
                        if (real.length) latestTsRef.current = real[real.length - 1].created_at
                    }
                    return merged
                })
            } catch { /* polling is best-effort */ }
        }, 5000)
        return () => clearInterval(interval)
    }, [session, userId])

    // ── Send message ─────────────────────────────────────────────────────
    async function handleSend(e) {
        e.preventDefault()
        if (!text.trim() || sending) return
        setError('')
        setSending(true)

        // Optimistic UI insert
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
            const realMsg = data.message

            // Replace optimistic with real message
            setMessages(prev => prev.map(m => m.id === optimistic.id ? realMsg : m))
            latestTsRef.current = realMsg.created_at

            // Broadcast to shared channel so the other user receives it instantly
            channelRef.current?.send({
                type: 'broadcast',
                event: 'dm',
                payload: { message: realMsg },
            }).catch(() => { })
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
