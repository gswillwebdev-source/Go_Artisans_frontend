'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const STATUS_META = {
  locked:           { label: 'In Progress',       color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', icon: '🔒' },
  worker_confirmed: { label: 'Worker Done — Awaiting Your Confirmation', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: '✅' },
  completed:        { label: 'Completed',          color: 'text-green-600', bg: 'bg-green-50 border-green-200', icon: '🎉' },
  refunded:         { label: 'Refunded',           color: 'text-slate-600', bg: 'bg-slate-50 border-slate-200', icon: '↩️' },
  disputed:         { label: 'Disputed',           color: 'text-red-600',   bg: 'bg-red-50 border-red-200',     icon: '⚠️' },
  cancelled:        { label: 'Cancelled',          color: 'text-slate-400', bg: 'bg-slate-50 border-slate-100', icon: '✗' },
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)}
          className={`text-3xl transition ${n <= value ? 'text-yellow-400' : 'text-slate-300 hover:text-yellow-300'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

export default function EscrowDetailPage() {
  const router = useRouter()
  const params = useParams()
  const escrowId = params?.id

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [escrow, setEscrow] = useState(null)
  const [review, setReview] = useState(null)
  const [viewerRole, setViewerRole] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Confirm modal state (client review)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const load = useCallback(async (token) => {
    const res = await fetch(`/api/escrow/${escrowId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error || 'Failed to load escrow')
      return
    }
    const data = await res.json()
    setEscrow(data.escrow)
    setReview(data.review)
    setViewerRole(data.viewer_role)
  }, [escrowId])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      if (!s) { router.replace('/login'); return }
      setSession(s)
      await load(s.access_token)
      setLoading(false)
    })
  }, [router, load])

  async function workerConfirm() {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/escrow/${escrowId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ role: 'worker' }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed'); setBusy(false); return }
    await load(session.access_token)
    setBusy(false)
  }

  async function clientConfirm(e) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating'); return }
    setBusy(true)
    setError('')
    const res = await fetch(`/api/escrow/${escrowId}/confirm`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ role: 'client', rating, comment }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed'); setBusy(false); return }
    setShowReviewForm(false)
    await load(session.access_token)
    setBusy(false)
  }

  async function cancelEscrow() {
    if (!confirm('Cancel this escrow? Your funds will be returned to your wallet.')) return
    setBusy(true)
    setError('')
    const res = await fetch(`/api/escrow/${escrowId}/cancel`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed'); setBusy(false); return }
    await load(session.access_token)
    setBusy(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  )

  if (error && !escrow) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
      <p className="text-red-600 font-semibold">{error}</p>
      <Link href="/wallet" className="text-blue-600 text-sm underline">← Back to Wallet</Link>
    </div>
  )

  const status = escrow?.status
  const meta = STATUS_META[status] || STATUS_META.locked
  const clientName = `${escrow?.client?.first_name || ''} ${escrow?.client?.last_name || ''}`.trim()
  const workerName = `${escrow?.worker?.first_name || ''} ${escrow?.worker?.last_name || ''}`.trim()

  return (
    <div className="min-h-screen bg-[var(--bg-0)] py-6 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/wallet" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--ink-900)]">Escrow Payment</h1>
            <p className="text-xs text-slate-500 font-mono">{escrowId?.slice(0, 8)}…</p>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${meta.bg}`}>
          <span className="text-2xl">{meta.icon}</span>
          <div>
            <p className={`font-bold text-sm ${meta.color}`}>{meta.label}</p>
            <p className="text-xs text-slate-500">Created {new Date(escrow?.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>

        {/* Amount card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold text-slate-700">Payment Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Agreed amount</span>
              <span className="font-semibold">{Number(escrow?.amount_xof).toLocaleString('fr-FR')} XOF</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Platform fee (5%)</span>
              <span className="text-slate-500">−{Number(escrow?.platform_fee_xof).toLocaleString('fr-FR')} XOF</span>
            </div>
            <div className="flex justify-between border-t pt-2 border-slate-100">
              <span className="text-slate-700 font-semibold">Worker receives</span>
              <span className="font-bold text-green-600">{Number(escrow?.worker_receives_xof).toLocaleString('fr-FR')} XOF</span>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500 font-semibold mb-0.5">Job Description</p>
            <p className="text-sm text-slate-700">{escrow?.description}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Parties</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">C</span>
                <div>
                  <p className="font-semibold text-slate-800">{clientName || 'Client'}</p>
                  <p className="text-xs text-slate-400">Client {viewerRole === 'client' ? '(you)' : ''}</p>
                </div>
              </div>
              {escrow?.client_confirmed_at ? (
                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Confirmed ✓</span>
              ) : (
                <span className="text-xs text-slate-400">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">W</span>
                <div>
                  <p className="font-semibold text-slate-800">{workerName || 'Worker'}</p>
                  <p className="text-xs text-slate-400">Worker {viewerRole === 'worker' ? '(you)' : ''}</p>
                </div>
              </div>
              {escrow?.worker_confirmed_at ? (
                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Work Done ✓</span>
              ) : (
                <span className="text-xs text-slate-400">In Progress</span>
              )}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-3">Progress</h2>
          <div className="relative pl-6 space-y-4 border-l-2 border-slate-100 ml-2">
            {[
              { done: true, label: 'Payment locked in escrow', time: escrow?.created_at },
              { done: !!escrow?.worker_confirmed_at, label: 'Worker confirmed job complete', time: escrow?.worker_confirmed_at },
              { done: !!escrow?.client_confirmed_at, label: 'Client confirmed & left review', time: escrow?.client_confirmed_at },
              { done: !!escrow?.released_at, label: 'Payment released to worker', time: escrow?.released_at },
            ].map((step, i) => (
              <div key={i} className="relative">
                <span className={`absolute -left-[23px] w-4 h-4 rounded-full border-2 ${step.done ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'}`} />
                <p className={`text-sm font-medium ${step.done ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</p>
                {step.time && (
                  <p className="text-xs text-slate-400">
                    {new Date(step.time).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Review (if completed) */}
        {review && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-green-800 mb-2">Review Left</h2>
            <div className="flex gap-0.5 mb-1">
              {[1,2,3,4,5].map(n => (
                <span key={n} className={`text-lg ${n <= review.rating ? 'text-yellow-400' : 'text-slate-300'}`}>★</span>
              ))}
            </div>
            {review.comment && <p className="text-sm text-green-800 mt-1">{review.comment}</p>}
          </div>
        )}

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

        {/* Actions */}
        <div className="space-y-3 pb-8">

          {/* Worker: mark work done */}
          {viewerRole === 'worker' && status === 'locked' && (
            <button onClick={workerConfirm} disabled={busy}
              className="w-full py-4 rounded-2xl bg-green-600 text-white font-bold text-sm disabled:opacity-50 transition hover:bg-green-700 active:scale-[0.98]">
              {busy ? 'Saving…' : '✅ Mark Job as Complete'}
            </button>
          )}

          {/* Worker: waiting for client */}
          {viewerRole === 'worker' && status === 'worker_confirmed' && (
            <div className="py-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold text-center">
              ⏳ Waiting for client to confirm and leave a review
            </div>
          )}

          {/* Client: confirm + review form */}
          {viewerRole === 'client' && status === 'worker_confirmed' && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm transition hover:bg-blue-700 active:scale-[0.98]">
              ⭐ Confirm Completion & Leave Review
            </button>
          )}

          {viewerRole === 'client' && status === 'worker_confirmed' && showReviewForm && (
            <form onSubmit={clientConfirm} className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-800">Confirm & Review</h3>
              <p className="text-xs text-slate-500">
                Once you confirm, <strong>{Number(escrow?.worker_receives_xof).toLocaleString('fr-FR')} XOF</strong> will be released to {workerName}. This action cannot be undone.
              </p>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Your Rating *</p>
                <StarPicker value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Comment (optional)</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="How was the work quality?"
                  maxLength={500}
                  rows={3}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowReviewForm(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={busy || rating === 0}
                  className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-bold disabled:opacity-50 transition hover:bg-green-700">
                  {busy ? 'Releasing…' : '✅ Confirm & Release Payment'}
                </button>
              </div>
            </form>
          )}

          {/* Client: cancel (only while locked) */}
          {viewerRole === 'client' && status === 'locked' && (
            <button onClick={cancelEscrow} disabled={busy}
              className="w-full py-3 rounded-2xl border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-50 transition disabled:opacity-50">
              {busy ? 'Processing…' : '✗ Cancel & Get Refund'}
            </button>
          )}

          {/* Completed state */}
          {status === 'completed' && (
            <div className="py-4 rounded-2xl bg-green-50 border border-green-200 text-green-700 text-sm font-semibold text-center">
              🎉 Payment has been released successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
