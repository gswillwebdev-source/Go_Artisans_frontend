'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function NewEscrowForm() {
  const router = useRouter()
  const params = useSearchParams()

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [worker, setWorker] = useState(null) // pre-filled from ?worker_id=
  const [workerSearch, setWorkerSearch] = useState('')
  const [workerResults, setWorkerResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!s) { router.replace('/login?redirect=/escrow/new'); return }
      setSession(s)

      // Load wallet balance
      const res = await fetch('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${s.access_token}` },
      })
      if (res.ok) {
        const d = await res.json()
        setBalance(Number(d.balance_xof ?? 0))
      }

      // Pre-fill worker from query param
      const wId = params.get('worker_id')
      if (wId) {
        const { data } = await supabase
          .from('users')
          .select('id, first_name, last_name, profile_picture')
          .eq('id', wId)
          .single()
        if (data) setWorker(data)
      }

      // Pre-fill job description from query param
      const desc = params.get('description')
      if (desc) setDescription(decodeURIComponent(desc))

      // Pre-fill amount from query param
      const amt = params.get('amount')
      if (amt) setAmount(amt)

      setLoading(false)
    })
  }, [router, params])

  async function searchWorkers(q) {
    if (!q.trim() || q.length < 2) { setWorkerResults([]); return }
    setSearching(true)
    const { data } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture')
      .eq('user_type', 'worker')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(8)
    setWorkerResults(data || [])
    setSearching(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!worker) { setError('Please select a worker'); return }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt < 100) { setError('Minimum amount is 100 XOF'); return }
    if (amt > balance) { setError(`Insufficient wallet balance. Your balance: ${balance.toLocaleString('fr-FR')} XOF`); return }
    if (!description.trim()) { setError('Please describe the job'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          worker_id: worker.id,
          amount_xof: amt,
          description: description.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to create escrow'); return }
      router.push(`/escrow/${data.escrow.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  )

  const fee = amount ? Math.round(Number(amount) * 0.05) : 0
  const workerGets = amount ? Math.max(0, Number(amount) - fee) : 0

  return (
    <div className="min-h-screen bg-[var(--bg-0)] py-6 px-4">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/wallet" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--ink-900)]">Create Secure Payment</h1>
            <p className="text-xs text-slate-500">Funds are locked until both parties confirm</p>
          </div>
        </div>

        {/* Balance pill */}
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-blue-600 font-semibold">Wallet Balance</p>
            <p className="text-lg font-bold text-blue-800">{balance.toLocaleString('fr-FR')} XOF</p>
          </div>
          {balance < 100 && (
            <Link href="/wallet?tab=deposit"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition">
              + Top Up
            </Link>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Worker selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-700">Who are you paying?</h2>

            {worker ? (
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                    {worker.profile_picture
                      ? <img src={worker.profile_picture} alt="" className="w-full h-full object-cover" />
                      : (worker.first_name?.[0] || 'W')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{worker.first_name} {worker.last_name}</p>
                    <p className="text-xs text-slate-400">Selected worker</p>
                  </div>
                </div>
                <button type="button" onClick={() => { setWorker(null); setWorkerSearch('') }}
                  className="text-slate-400 hover:text-red-500 transition p-1 text-lg">✕</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={workerSearch}
                  onChange={e => { setWorkerSearch(e.target.value); searchWorkers(e.target.value) }}
                  placeholder="Search worker by name…"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {searching && <p className="text-xs text-slate-400 mt-1.5 px-1">Searching…</p>}
                {workerResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                    {workerResults.map(w => (
                      <button key={w.id} type="button"
                        onClick={() => { setWorker(w); setWorkerSearch(''); setWorkerResults([]) }}
                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-50 transition text-left border-b border-slate-100 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                          {w.profile_picture
                            ? <img src={w.profile_picture} alt="" className="w-full h-full object-cover" />
                            : (w.first_name?.[0] || 'W')}
                        </div>
                        <p className="text-sm font-semibold text-slate-800">{w.first_name} {w.last_name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-700">Agreed Amount</h2>
            <input
              type="number"
              min={100}
              step={50}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {amount && Number(amount) >= 100 && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>You pay</span>
                  <span className="font-semibold">{Number(amount).toLocaleString('fr-FR')} XOF</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Platform fee (5%)</span>
                  <span>−{fee.toLocaleString('fr-FR')} XOF</span>
                </div>
                <div className="flex justify-between text-green-700 font-bold border-t border-slate-200 pt-1.5">
                  <span>{worker ? `${worker.first_name} receives` : 'Worker receives'}</span>
                  <span>{workerGets.toLocaleString('fr-FR')} XOF</span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h2 className="text-sm font-bold text-slate-700">Job Description</h2>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe exactly what work will be done (e.g. 'Install bathroom tiles in a 10m² room')"
              maxLength={300}
              rows={3}
              required
              className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-slate-400 text-right">{description.length}/300</p>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          {/* Disclaimer */}
          <p className="text-xs text-slate-400 text-center px-4">
            By creating this payment, {amount ? `${Number(amount).toLocaleString('fr-FR')} XOF` : 'funds'} will be locked from your wallet immediately and held securely until both parties confirm the job is done.
          </p>

          <button type="submit" disabled={submitting || !worker || !amount || !description.trim()}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm disabled:opacity-40 transition hover:bg-blue-700 active:scale-[0.98]">
            {submitting ? 'Locking funds…' : `🔒 Lock ${amount ? `${Number(amount).toLocaleString('fr-FR')} XOF` : 'Funds'} in Escrow`}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function NewEscrowPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /></div>}>
      <NewEscrowForm />
    </Suspense>
  )
}
