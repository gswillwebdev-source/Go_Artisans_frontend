'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const PAYMENT_METHODS = [
    { id: 'mtn', label: 'MTN Mobile Money', flag: '🟡' },
    { id: 'moov', label: 'Moov Money', flag: '🔵' },
    { id: 'orange', label: 'Orange Money', flag: '🟠' },
    { id: 'togocel', label: 'Togocel', flag: '🔴' },
]

const TX_LABELS = {
    deposit: { label: 'Top-up', color: 'text-green-600', sign: '+', bg: 'bg-green-50 border-green-200' },
    escrow_lock: { label: 'Job Payment Locked', color: 'text-orange-600', sign: '-', bg: 'bg-orange-50 border-orange-200' },
    escrow_release: { label: 'Job Payment Received', color: 'text-green-600', sign: '+', bg: 'bg-green-50 border-green-200' },
    escrow_refund: { label: 'Refund', color: 'text-blue-600', sign: '+', bg: 'bg-blue-50 border-blue-200' },
    withdrawal: { label: 'Withdrawal', color: 'text-red-600', sign: '-', bg: 'bg-red-50 border-red-200' },
}

export default function WalletPage() {
    const router = useRouter()
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [balance, setBalance] = useState(0)
    const [transactions, setTransactions] = useState([])
    const [tab, setTab] = useState('overview') // 'overview' | 'deposit'
    const [method, setMethod] = useState('mtn')
    const [phone, setPhone] = useState('')
    const [amount, setAmount] = useState('')
    const [depositing, setDepositing] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

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

    async function handleDeposit(e) {
        e.preventDefault()
        setError('')
        setSuccess('')
        const amt = Number(amount)
        if (!Number.isFinite(amt) || amt < 500) {
            setError('Minimum deposit is 500 XOF')
            return
        }
        if (!phone.trim()) {
            setError('Phone number is required')
            return
        }

        setDepositing(true)
        try {
            const token = session?.access_token
            const res = await fetch('/api/wallet/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ amount_xof: amt, payment_method: method, phone_number: phone.trim() }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error || 'Deposit failed'); return }
            // Redirect to FedaPay checkout
            window.location.href = data.checkout_url
        } catch {
            setError('Something went wrong. Please try again.')
        } finally {
            setDepositing(false)
        }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-[var(--bg-0)] py-6 px-4">
            <div className="max-w-lg mx-auto space-y-5">

                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-[var(--ink-900)]">My Wallet</h1>
                        <p className="text-xs text-slate-500">Save money on the app for secure job payments</p>
                    </div>
                </div>

                {/* Balance card */}
                <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white shadow-lg shadow-blue-500/25">
                    <p className="text-sm font-medium text-blue-200 mb-1">Available Balance</p>
                    <p className="text-4xl font-bold tracking-tight mb-4">
                        {balance.toLocaleString('fr-FR')} <span className="text-2xl font-semibold text-blue-200">XOF</span>
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => { setTab('deposit'); setError(''); setSuccess('') }}
                            className="flex-1 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-semibold transition border border-white/20"
                        >
                            + Top Up
                        </button>
                        <Link
                            href="/escrow/new"
                            className="flex-1 py-2.5 rounded-xl bg-white text-blue-700 text-sm font-semibold transition hover:bg-blue-50 text-center"
                        >
                            🔒 Pay for a Job
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {[['overview', '📊 Overview'], ['deposit', '💳 Top Up']].map(([key, label]) => (
                        <button key={key} onClick={() => { setTab(key); setError(''); setSuccess('') }}
                            className={`flex-1 py-3 text-sm font-semibold transition ${tab === key ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {label}
                        </button>
                    ))}
                </div>

                {/* Overview tab */}
                {tab === 'overview' && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 px-1">Recent Transactions</p>
                        {transactions.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                                <p className="text-slate-400 text-sm">No transactions yet.</p>
                                <p className="text-slate-400 text-xs mt-1">Top up your wallet to get started.</p>
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
                                                    {new Date(tx.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
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

                        {/* Escrow info panel */}
                        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                            <h3 className="text-sm font-bold text-blue-800 mb-2">🔒 How Escrow Payments Work</h3>
                            <ol className="space-y-1.5 text-xs text-blue-700">
                                <li><span className="font-semibold">1.</span> Top up your wallet via mobile money or card</li>
                                <li><span className="font-semibold">2.</span> Create an escrow for your job — funds are locked safely</li>
                                <li><span className="font-semibold">3.</span> Worker completes the job and confirms</li>
                                <li><span className="font-semibold">4.</span> You confirm completion and leave a review</li>
                                <li><span className="font-semibold">5.</span> Payment is released automatically to the worker</li>
                            </ol>
                            <p className="text-xs text-blue-500 mt-2">Platform fee: 5% per transaction. No hidden charges.</p>
                        </div>
                    </div>
                )}

                {/* Top-up / Deposit tab */}
                {tab === 'deposit' && (
                    <form onSubmit={handleDeposit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-800">Add Money to Wallet</h2>

                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount (XOF)</label>
                            <input
                                type="number"
                                min={500}
                                step={100}
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="e.g. 5000"
                                required
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="flex gap-2 mt-2">
                                {[1000, 2500, 5000, 10000].map(v => (
                                    <button key={v} type="button" onClick={() => setAmount(String(v))}
                                        className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                                        {v.toLocaleString('fr-FR')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Payment method */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Method</label>
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map(m => (
                                    <button key={m.id} type="button" onClick={() => setMethod(m.id)}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition ${method === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                        <span>{m.flag}</span> {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+228 90 00 00 00"
                                required
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}
                        {success && <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-xl px-4 py-3">{success}</p>}

                        <button type="submit" disabled={depositing}
                            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm disabled:opacity-50 transition hover:bg-blue-700 active:scale-[0.98]">
                            {depositing ? 'Redirecting to payment…' : `Pay ${amount ? `${Number(amount).toLocaleString('fr-FR')} XOF` : ''} via ${PAYMENT_METHODS.find(m => m.id === method)?.label}`}
                        </button>

                        <p className="text-xs text-center text-slate-400">You will be redirected to FedaPay to complete your payment securely.</p>
                    </form>
                )}
            </div>
        </div>
    )
}
