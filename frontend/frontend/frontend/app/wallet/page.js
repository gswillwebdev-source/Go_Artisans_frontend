'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

const PAYMENT_METHODS = [
    { id: 'mtn', label: 'MTN Mobile Money', flag: '🟡' },
    { id: 'moov', label: 'Moov Money', flag: '🔵' },
    { id: 'orange', label: 'Orange Money', flag: '🟠' },
    { id: 'togocel', label: 'Togocel', flag: '🔴' },
]

const TX_LABELS = {
    deposit:        { label: 'Top-up',              color: 'text-green-600',  sign: '+', bg: 'bg-green-50 border-green-200'   },
    escrow_lock:    { label: 'Job Payment Locked',  color: 'text-orange-600', sign: '-', bg: 'bg-orange-50 border-orange-200' },
    escrow_release: { label: 'Job Payment Received',color: 'text-green-600',  sign: '+', bg: 'bg-green-50 border-green-200'   },
    escrow_refund:  { label: 'Refund',              color: 'text-blue-600',   sign: '+', bg: 'bg-blue-50 border-blue-200'     },
    withdrawal:     { label: 'Withdrawal',          color: 'text-red-600',    sign: '-', bg: 'bg-red-50 border-red-200'       },
    send:           { label: 'Sent',                color: 'text-red-600',    sign: '-', bg: 'bg-red-50 border-red-200'       },
    receive:        { label: 'Received',            color: 'text-green-600',  sign: '+', bg: 'bg-green-50 border-green-200'   },
}

// ── Shared small field styles ──────────────────────────────────────────────
const inputCls = 'w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'

function WalletContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [session, setSession]         = useState(null)
    const [loading, setLoading]         = useState(true)
    const [balance, setBalance]         = useState(0)
    const [transactions, setTransactions] = useState([])
    const [tab, setTab]                 = useState(searchParams.get('tab') || 'overview')

    // Deposit state
    const [depMethod, setDepMethod]     = useState('mtn')
    const [depPhone, setDepPhone]       = useState('')
    const [depAmount, setDepAmount]     = useState('')
    const [depositing, setDepositing]   = useState(false)

    // Send state
    const [sendQuery, setSendQuery]     = useState('')
    const [sendResults, setSendResults] = useState([])
    const [sendUser, setSendUser]       = useState(null)
    const [sendAmount, setSendAmount]   = useState('')
    const [sendNote, setSendNote]       = useState('')
    const [sending, setSending]         = useState(false)
    const searchTimer                   = useRef(null)

    // Withdraw state
    const [wdMethod, setWdMethod]       = useState('mtn')
    const [wdPhone, setWdPhone]         = useState('')
    const [wdAmount, setWdAmount]       = useState('')
    const [withdrawing, setWithdrawing] = useState(false)

    // Shared feedback
    const [error, setError]             = useState('')
    const [success, setSuccess]         = useState('')

    const clearFeedback = () => { setError(''); setSuccess('') }
    const switchTab = (t) => { setTab(t); clearFeedback() }

    useEffect(() => {
        supabase.auth.getSession().then(async ({ data: { session: s } }) => {
            if (!s) { router.replace('/login?redirect=/wallet'); return }
            setSession(s)
            await loadWallet(s)
            setLoading(false)
        })
    }, [router])

    async function loadWallet(s) {
        const token = s?.access_token
        if (!token) return
        const res = await fetch('/api/wallet/balance', {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        setBalance(Number(data.balance_xof ?? 0))
        setTransactions(data.transactions ?? [])
    }

    // ── DEPOSIT ────────────────────────────────────────────────────────
    async function handleDeposit(e) {
        e.preventDefault()
        clearFeedback()
        const amt = Number(depAmount)
        if (!Number.isFinite(amt) || amt < 500) { setError('Minimum deposit is 500 XOF'); return }
        if (!depPhone.trim()) { setError('Phone number is required'); return }
        setDepositing(true)
        try {
            const res = await fetch('/api/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ amount_xof: amt, payment_method: depMethod, phone_number: depPhone.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Deposit failed'); return }
            window.location.href = data.checkout_url
        } catch { setError('Something went wrong. Please try again.') }
        finally { setDepositing(false) }
    }

    // ── SEND ────────────────────────────────────────────────────────────
    function onSendQueryChange(q) {
        setSendQuery(q)
        setSendUser(null)
        clearTimeout(searchTimer.current)
        if (q.trim().length < 2) { setSendResults([]); return }
        searchTimer.current = setTimeout(async () => {
            const res = await fetch(`/api/wallet/search-user?q=${encodeURIComponent(q)}`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
            })
            if (res.ok) { const d = await res.json(); setSendResults(d.users || []) }
        }, 300)
    }

    async function handleSend(e) {
        e.preventDefault()
        clearFeedback()
        if (!sendUser) { setError('Select a recipient first'); return }
        const amt = Number(sendAmount)
        if (!Number.isFinite(amt) || amt < 100) { setError('Minimum send is 100 XOF'); return }
        if (amt > balance) { setError(`Insufficient balance. Available: ${balance.toLocaleString('fr-FR')} XOF`); return }
        setSending(true)
        try {
            const res = await fetch('/api/wallet/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ recipient_id: sendUser.id, amount_xof: amt, note: sendNote.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Transfer failed'); return }
            setSuccess(data.message)
            setSendUser(null); setSendQuery(''); setSendAmount(''); setSendNote(''); setSendResults([])
            await loadWallet(session)
        } catch { setError('Something went wrong. Please try again.') }
        finally { setSending(false) }
    }

    // ── WITHDRAW ────────────────────────────────────────────────────────
    async function handleWithdraw(e) {
        e.preventDefault()
        clearFeedback()
        const amt = Number(wdAmount)
        if (!Number.isFinite(amt) || amt < 1000) { setError('Minimum withdrawal is 1,000 XOF'); return }
        if (amt > balance) { setError(`Insufficient balance. Available: ${balance.toLocaleString('fr-FR')} XOF`); return }
        if (!wdPhone.trim()) { setError('Phone number is required'); return }
        setWithdrawing(true)
        try {
            const res = await fetch('/api/wallet/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ amount_xof: amt, payment_method: wdMethod, phone_number: wdPhone.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Withdrawal failed'); return }
            setSuccess(data.message)
            setWdAmount('')
            await loadWallet(session)
        } catch { setError('Something went wrong. Please try again.') }
        finally { setWithdrawing(false) }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
    )

    const TABS = [
        { key: 'overview',  label: '📊',  full: 'Overview'    },
        { key: 'deposit',   label: '💳',  full: 'Add Money'   },
        { key: 'send',      label: '➡️',  full: 'Send'        },
        { key: 'withdraw',  label: '⬇️',  full: 'Withdraw'    },
    ]

    return (
        <div className="min-h-screen bg-[var(--bg-0)] py-6 px-4">
            <div className="max-w-lg mx-auto space-y-5">

                {/* ── Header ──────────────────────────────────────────── */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--ink-900)]">My Wallet</h1>
                        <p className="text-xs text-slate-500">Add, send, and withdraw money securely</p>
                    </div>
                </div>

                {/* ── Balance card ─────────────────────────────────────── */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-500/25">
                    <p className="text-sm font-medium text-blue-200 mb-1">Available Balance</p>
                    <p className="text-4xl font-bold tracking-tight mb-5">
                        {balance.toLocaleString('fr-FR')}{' '}
                        <span className="text-2xl font-semibold text-blue-200">XOF</span>
                    </p>
                    {/* Quick action grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { tab: 'deposit',  icon: '＋', label: 'Add' },
                            { tab: 'send',     icon: '↗',  label: 'Send' },
                            { tab: 'withdraw', icon: '↓',  label: 'Withdraw' },
                            { href: '/escrow/new', icon: '🔒', label: 'Pay Job' },
                        ].map(a => a.href ? (
                            <Link key={a.label} href={a.href}
                                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition border border-white/20">
                                <span className="text-lg leading-none">{a.icon}</span>
                                <span className="text-[10px] font-semibold text-white/90">{a.label}</span>
                            </Link>
                        ) : (
                            <button key={a.tab} onClick={() => switchTab(a.tab)}
                                className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition border border-white/20">
                                <span className="text-lg leading-none font-bold">{a.icon}</span>
                                <span className="text-[10px] font-semibold text-white/90">{a.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Tab bar ───────────────────────────────────────────── */}
                <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {TABS.map(t => (
                        <button key={t.key} onClick={() => switchTab(t.key)}
                            className={`flex-1 py-3 text-xs font-bold transition flex flex-col items-center gap-0.5
                                ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <span className="text-base leading-none">{t.label}</span>
                            <span className="hidden sm:block">{t.full}</span>
                        </button>
                    ))}
                </div>

                {/* ── Feedback ──────────────────────────────────────────── */}
                {error   && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
                {success && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3">{success}</p>}

                {/* ══════════════════════════════════════════════════════
                    OVERVIEW TAB
                ══════════════════════════════════════════════════════ */}
                {tab === 'overview' && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Recent Transactions</p>
                        {transactions.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                                <p className="text-2xl mb-2">💳</p>
                                <p className="text-slate-500 text-sm font-semibold">No transactions yet</p>
                                <p className="text-slate-400 text-xs mt-1">Add money to get started.</p>
                                <button onClick={() => switchTab('deposit')}
                                    className="mt-4 px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition">
                                    + Add Money
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {transactions.map(tx => {
                                    const meta = TX_LABELS[tx.type] || { label: tx.type, color: 'text-slate-600', sign: '', bg: 'bg-slate-50 border-slate-200' }
                                    return (
                                        <div key={tx.id} className={`flex items-center justify-between p-4 rounded-xl border ${meta.bg}`}>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-semibold ${meta.color}`}>{meta.label}</p>
                                                {tx.description && (
                                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{tx.description}</p>
                                                )}
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {new Date(tx.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className={`text-base font-bold ml-4 shrink-0 ${meta.color}`}>
                                                {meta.sign}{Number(tx.amount_xof).toLocaleString('fr-FR')} XOF
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Info panel */}
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                            <h3 className="text-sm font-bold text-blue-800 mb-2">💡 What can I do with my wallet?</h3>
                            <ul className="space-y-1 text-xs text-blue-700">
                                <li>💳 <strong>Add Money</strong> — Top up via MTN, Moov, Orange or Togocel</li>
                                <li>↗ <strong>Send</strong> — Transfer money to any GoArtisans user instantly</li>
                                <li>⬇ <strong>Withdraw</strong> — Cash out to your mobile money account</li>
                                <li>🔒 <strong>Pay for a Job</strong> — Lock funds in escrow so workers get paid fairly</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
                    ADD MONEY (DEPOSIT) TAB
                ══════════════════════════════════════════════════════ */}
                {tab === 'deposit' && (
                    <form onSubmit={handleDeposit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-800">Add Money to Wallet</h2>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (XOF)</label>
                            <input type="number" min={500} step={100} value={depAmount}
                                onChange={e => setDepAmount(e.target.value)}
                                placeholder="e.g. 5 000" required className={inputCls} />
                            <div className="flex gap-2 mt-2">
                                {[1000, 2500, 5000, 10000].map(v => (
                                    <button key={v} type="button" onClick={() => setDepAmount(String(v))}
                                        className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                                        {v.toLocaleString('fr-FR')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Method</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map(m => (
                                    <button key={m.id} type="button" onClick={() => setDepMethod(m.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition
                                            ${depMethod === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        <span>{m.flag}</span>{m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                            <input type="tel" value={depPhone} onChange={e => setDepPhone(e.target.value)}
                                placeholder="+228 90 00 00 00" required className={inputCls} />
                        </div>

                        <button type="submit" disabled={depositing}
                            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50 transition hover:bg-blue-700 active:scale-[0.98]">
                            {depositing ? 'Redirecting to payment…'
                                : `Pay ${depAmount ? `${Number(depAmount).toLocaleString('fr-FR')} XOF` : ''} via ${PAYMENT_METHODS.find(m => m.id === depMethod)?.label}`}
                        </button>
                        <p className="text-xs text-center text-slate-400">You will be redirected to FedaPay to complete payment securely.</p>
                    </form>
                )}

                {/* ══════════════════════════════════════════════════════
                    SEND MONEY TAB
                ══════════════════════════════════════════════════════ */}
                {tab === 'send' && (
                    <form onSubmit={handleSend} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-800">Send Money</h2>
                        <p className="text-xs text-slate-500">Transfer instantly to any GoArtisans user. No fees.</p>

                        {/* Recipient picker */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Recipient</label>
                            {sendUser ? (
                                <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                                            {sendUser.profile_picture
                                                ? <img src={sendUser.profile_picture} alt="" className="w-full h-full object-cover" />
                                                : sendUser.first_name?.[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{sendUser.first_name} {sendUser.last_name}</p>
                                            <p className="text-xs text-slate-400 capitalize">{sendUser.user_type}</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => { setSendUser(null); setSendQuery('') }}
                                        className="text-slate-400 hover:text-red-500 p-1 text-lg transition">✕</button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <input type="text" value={sendQuery}
                                        onChange={e => onSendQueryChange(e.target.value)}
                                        placeholder="Search by name or email…" className={inputCls} />
                                    {sendResults.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                                            {sendResults.map(u => (
                                                <button key={u.id} type="button"
                                                    onClick={() => { setSendUser(u); setSendQuery(''); setSendResults([]) }}
                                                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                                                        {u.profile_picture
                                                            ? <img src={u.profile_picture} alt="" className="w-full h-full object-cover" />
                                                            : u.first_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-800">{u.first_name} {u.last_name}</p>
                                                        <p className="text-xs text-slate-400 capitalize">{u.user_type}</p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (XOF)</label>
                            <input type="number" min={100} step={50} value={sendAmount}
                                onChange={e => setSendAmount(e.target.value)}
                                placeholder="e.g. 2 000" required className={inputCls} />
                            {sendAmount && Number(sendAmount) > balance && (
                                <p className="text-xs text-red-500 mt-1">Exceeds your balance ({balance.toLocaleString('fr-FR')} XOF)</p>
                            )}
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Note (optional)</label>
                            <input type="text" value={sendNote} onChange={e => setSendNote(e.target.value)}
                                maxLength={200} placeholder="e.g. For the kitchen tiles job" className={inputCls} />
                        </div>

                        <button type="submit" disabled={sending || !sendUser || !sendAmount}
                            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-40 transition hover:bg-blue-700 active:scale-[0.98]">
                            {sending ? 'Sending…'
                                : `Send ${sendAmount ? `${Number(sendAmount).toLocaleString('fr-FR')} XOF` : ''}${sendUser ? ` to ${sendUser.first_name}` : ''}`}
                        </button>
                        <p className="text-xs text-center text-slate-400">Transfers are instant and free. Cannot be reversed.</p>
                    </form>
                )}

                {/* ══════════════════════════════════════════════════════
                    WITHDRAW TAB
                ══════════════════════════════════════════════════════ */}
                {tab === 'withdraw' && (
                    <form onSubmit={handleWithdraw} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-800">Withdraw to Mobile Money</h2>
                        <p className="text-xs text-slate-500">Cash out your wallet balance. Minimum: 1,000 XOF. Arrives within 24 hours.</p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (XOF)</label>
                            <input type="number" min={1000} step={100} value={wdAmount}
                                onChange={e => setWdAmount(e.target.value)}
                                placeholder="e.g. 5 000" required className={inputCls} />
                            {/* Quick fill buttons */}
                            {balance > 0 && (
                                <div className="flex gap-2 mt-2">
                                    {[Math.floor(balance * 0.25), Math.floor(balance * 0.5), Math.floor(balance * 0.75), balance].map((v, i) => (
                                        v >= 1000 ? (
                                            <button key={i} type="button" onClick={() => setWdAmount(String(v))}
                                                className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                                                {i === 3 ? 'All' : `${Math.round(v / 1000)}k`}
                                            </button>
                                        ) : null
                                    )).filter(Boolean)}
                                </div>
                            )}
                            {wdAmount && Number(wdAmount) > balance && (
                                <p className="text-xs text-red-500 mt-1">Exceeds your balance ({balance.toLocaleString('fr-FR')} XOF)</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mobile Money Network</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map(m => (
                                    <button key={m.id} type="button" onClick={() => setWdMethod(m.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition
                                            ${wdMethod === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        <span>{m.flag}</span>{m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                            <input type="tel" value={wdPhone} onChange={e => setWdPhone(e.target.value)}
                                placeholder="+228 90 00 00 00" required className={inputCls} />
                        </div>

                        {/* Summary */}
                        {wdAmount && Number(wdAmount) >= 1000 && Number(wdAmount) <= balance && (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                                <div className="flex justify-between text-slate-600">
                                    <span>You withdraw</span>
                                    <span className="font-semibold">{Number(wdAmount).toLocaleString('fr-FR')} XOF</span>
                                </div>
                                <div className="flex justify-between text-slate-500">
                                    <span>Network fee</span>
                                    <span>Free</span>
                                </div>
                                <div className="flex justify-between text-green-700 font-bold border-t border-slate-200 pt-1">
                                    <span>You receive</span>
                                    <span>{Number(wdAmount).toLocaleString('fr-FR')} XOF</span>
                                </div>
                            </div>
                        )}

                        <button type="submit" disabled={withdrawing || balance < 1000}
                            className="w-full py-3.5 rounded-xl bg-green-600 text-white font-bold text-sm disabled:opacity-40 transition hover:bg-green-700 active:scale-[0.98]">
                            {withdrawing ? 'Submitting withdrawal…'
                                : balance < 1000
                                    ? 'Minimum balance 1,000 XOF required'
                                    : `Withdraw ${wdAmount ? `${Number(wdAmount).toLocaleString('fr-FR')} XOF` : ''} to ${PAYMENT_METHODS.find(m => m.id === wdMethod)?.label}`}
                        </button>
                        <p className="text-xs text-center text-slate-400">Funds are debited immediately. Transfer takes up to 24 hours.</p>
                    </form>
                )}

            </div>
        </div>
    )
}

export default function WalletPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            </div>
        }>
            <WalletContent />
        </Suspense>
    )
}

