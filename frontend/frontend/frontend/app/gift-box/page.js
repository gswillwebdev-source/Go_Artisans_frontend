'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const PAYOUT_RATE = 3  // 1 received coin = 3 XOF

const statusStyle = s => ({
  pending: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  processing: 'text-blue-700   bg-blue-50   border-blue-200',
  paid: 'text-green-700  bg-green-50  border-green-200',
  completed: 'text-green-700  bg-green-50  border-green-200',
  rejected: 'text-red-700    bg-red-50    border-red-200',
  failed: 'text-red-700    bg-red-50    border-red-200',
}[s] || 'text-slate-600 bg-slate-50 border-slate-200')

const TABS = [['overview', 'Overview'], ['received', 'Received 💝'], ['history', 'History'], ['withdraw', 'Withdraw 💸']]

export default function GiftBox() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [purchases, setPurchases] = useState([])
  const [received, setReceived] = useState([])
  const [sent, setSent] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [wPhone, setWPhone] = useState('')
  const [wMethod, setWMethod] = useState('mtn')
  const [wAmount, setWAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [wSuccess, setWSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      setUser(session.user)
      const uid = session.user.id
      const [coinsR, purchR, recvR, sentR, wdR] = await Promise.all([
        supabase.from('user_coins').select('balance').eq('user_id', uid).single(),
        supabase.from('coin_purchases').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
        supabase.from('video_gifts').select('id,gift_emoji,gift_name,gift_cost,created_at,sender:sender_id(first_name,last_name)').eq('recipient_id', uid).order('created_at', { ascending: false }).limit(30),
        supabase.from('video_gifts').select('id,gift_emoji,gift_name,gift_cost,created_at').eq('sender_id', uid).order('created_at', { ascending: false }).limit(30),
        supabase.from('gift_withdrawals').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
      ])
      setBalance(coinsR.data?.balance ?? 0)
      setPurchases(purchR.data ?? [])
      setReceived(recvR.data ?? [])
      setSent(sentR.data ?? [])
      setWithdrawals(wdR.data ?? [])
      setLoading(false)
    }
    load()
  }, [router])

  const totalPurchased = purchases.filter(p => p.status === 'completed').reduce((s, p) => s + (p.coins_amount ?? 0), 0)
  const pendingPurchased = purchases.filter(p => p.status === 'pending').reduce((s, p) => s + (p.coins_amount ?? 0), 0)
  const totalReceived = received.reduce((s, g) => s + (g.gift_cost ?? 0), 0)
  const totalSpent = sent.reduce((s, g) => s + (g.gift_cost ?? 0), 0)
  const pendingOut = withdrawals.filter(w => ['pending', 'processing'].includes(w.status)).reduce((s, w) => s + (w.coins_amount ?? 0), 0)
  const availableW = Math.max(0, totalReceived - pendingOut)

  const purchaseStatusLabel = s => ({
    pending: 'Awaiting FedaPay confirmation',
    completed: 'Payment confirmed',
    failed: 'Payment failed',
  }[s] || s)

  const handleWithdraw = async () => {
    const coins = parseInt(wAmount)
    if (!wPhone.trim() || !coins || coins < 1 || coins > availableW) return
    setSubmitting(true)
    const newRow = {
      user_id: user.id,
      coins_amount: coins,
      estimated_xof: coins * PAYOUT_RATE,
      payment_method: wMethod,
      phone_number: wPhone.trim(),
      status: 'pending',
    }
    await supabase.from('gift_withdrawals').insert(newRow)
    setWithdrawals(prev => [{ ...newRow, created_at: new Date().toISOString() }, ...prev])
    setWSuccess(true)
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-0)]">
      <div className="h-8 w-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-0)] py-8 px-4 pb-24">
      <div className="max-w-lg mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/worker-profile" className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--ink-900)]">My Gift Box 🎁</h1>
            <p className="text-sm text-[var(--ink-500)]">Your coins, gifts &amp; earnings</p>
          </div>
          <Link href="/gift-store" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-sm shadow-sm hover:from-yellow-500 hover:to-orange-600 transition">
            🪙 Buy Coins
          </Link>
        </div>

        {/* Balance card */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-6 text-white shadow-xl shadow-orange-200">
          <p className="text-sm font-semibold opacity-80">Current Balance</p>
          <p className="text-5xl font-bold mt-1">{balance.toLocaleString()}</p>
          <p className="text-sm opacity-80 mt-0.5">coins 🪙</p>
          <div className="flex gap-2 mt-4">
            <Link href="/gift-store" className="flex-1 py-2 text-center rounded-xl bg-white/20 hover:bg-white/30 font-semibold text-sm transition">+ Buy More</Link>
            <Link href="/videos" className="flex-1 py-2 text-center rounded-xl bg-white/20 hover:bg-white/30 font-semibold text-sm transition">🎁 Send Gift</Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-slate-900">{totalPurchased.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">🛒 Purchased</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-red-500">{totalSpent.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">🎁 Sent</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{totalReceived.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-1">💝 Received</p>
          </div>
        </div>

        {pendingPurchased > 0 && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm">
            <p className="font-semibold text-yellow-800">Pending Payment Confirmation</p>
            <p className="text-yellow-700 mt-0.5">
              {pendingPurchased.toLocaleString()} coins are waiting for FedaPay payment confirmation.
              Coins will appear in your balance automatically after confirmation.
            </p>
          </div>
        )}

        {/* Tab nav */}
        <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${tab === id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            >{label}</button>
          ))}
        </div>

        {/* ── Overview ── */}
        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-2 text-sm">
              {[
                ['🛒 Total purchased', `${totalPurchased.toLocaleString()} 🪙`, 'text-slate-900'],
                ['🎁 Total gifted out', `-${totalSpent.toLocaleString()} 🪙`, 'text-red-500'],
                ['💝 Total received', `+${totalReceived.toLocaleString()} 🪙`, 'text-green-600'],
              ].map(([k, v, c]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-600">{k}</span>
                  <span className={`font-bold ${c}`}>{v}</span>
                </div>
              ))}
              <div className="h-px bg-slate-100 my-1" />
              <div className="flex justify-between">
                <span className="text-slate-700 font-semibold">💳 Balance</span>
                <span className="font-bold text-yellow-600">{balance.toLocaleString()} 🪙</span>
              </div>
              {totalReceived > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">💸 Earnings value</span>
                  <span className="font-bold text-purple-700">≈ {(availableW * PAYOUT_RATE).toLocaleString()} XOF</span>
                </div>
              )}
            </div>
            {totalReceived > 0 && (
              <button onClick={() => setTab('withdraw')}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm hover:from-violet-700 hover:to-purple-700 transition"
              >💸 Convert Gifts to Real Money</button>
            )}
          </div>
        )}

        {/* ── Received ── */}
        {tab === 'received' && (
          <div>
            {received.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-3xl mb-2">🎁</p>
                <p className="font-semibold">No gifts received yet</p>
                <p className="text-sm mt-1">Post videos to receive gifts from fans!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {received.map(g => (
                  <div key={g.id} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3 shadow-sm">
                    <span className="text-2xl">{g.gift_emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">{g.gift_name} from {g.sender?.first_name} {g.sender?.last_name}</p>
                      <p className="text-xs text-slate-500">{new Date(g.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-green-600 font-bold text-sm">+{g.gift_cost} 🪙</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <div className="space-y-2">
            {purchases.length === 0 && sent.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p className="text-3xl mb-2">📋</p><p className="font-semibold">No transactions yet</p>
              </div>
            ) : (
              [...purchases.map(p => ({ ...p, _type: 'purchase' })), ...sent.map(s => ({ ...s, _type: 'sent' }))]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map((item, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-3 shadow-sm">
                    <span className="text-2xl">{item._type === 'purchase' ? '🛒' : item.gift_emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-900">
                        {item._type === 'purchase' ? `Bought coins · ${item.payment_method?.toUpperCase()}` : `Sent ${item.gift_name}`}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold text-sm ${item._type === 'purchase' ? 'text-green-600' : 'text-red-500'}`}>
                        {item._type === 'purchase' ? `+${item.coins_amount}` : `-${item.gift_cost}`} 🪙
                      </span>
                      {item._type === 'purchase' && (
                        <p className={`text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-full border ${statusStyle(item.status)}`}>
                          {purchaseStatusLabel(item.status)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {/* ── Withdraw ── */}
        {tab === 'withdraw' && (
          <div className="space-y-4">
            {wSuccess ? (
              <div className="text-center py-12">
                <p className="text-5xl mb-3">✅</p>
                <p className="text-xl font-bold text-slate-900">Withdrawal Requested!</p>
                <p className="text-slate-500 text-sm mt-2">We'll process your payout within 24-48 hours.</p>
                <button onClick={() => setWSuccess(false)} className="mt-4 text-blue-600 text-sm hover:underline">Make another withdrawal</button>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-4">
                  <p className="font-semibold text-violet-800">Available to withdraw</p>
                  <p className="text-3xl font-bold text-violet-900 mt-1">{availableW.toLocaleString()} coins</p>
                  <p className="text-sm text-violet-700 mt-1">≈ {(availableW * PAYOUT_RATE).toLocaleString()} XOF · Rate: 1 coin = {PAYOUT_RATE} XOF</p>
                </div>

                {availableW === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-3xl mb-2">💸</p>
                    <p className="font-semibold">No coins available to withdraw</p>
                    <p className="text-sm mt-1">Receive gifts from your fans first!</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4 shadow-sm">
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-1.5">Coins to withdraw</label>
                      <input type="number" value={wAmount} onChange={e => setWAmount(e.target.value)}
                        placeholder={`Max ${availableW}`} min={1} max={availableW}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-400 outline-none font-semibold text-lg"
                      />
                      {wAmount && <p className="text-xs text-violet-600 mt-1 font-semibold">≈ {(parseInt(wAmount || 0) * PAYOUT_RATE).toLocaleString()} XOF payout</p>}
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-1.5">Payout Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['mtn', 'moov', 'orange'].map(m => (
                          <button key={m} onClick={() => setWMethod(m)}
                            className={`py-2 rounded-xl border-2 text-xs font-bold transition ${wMethod === m ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-violet-300'}`}
                          >📱 {m.toUpperCase()}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-slate-700 block mb-1.5">Mobile Money Number</label>
                      <input type="tel" value={wPhone} onChange={e => setWPhone(e.target.value)}
                        placeholder="Your mobile money number"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-400 outline-none"
                      />
                    </div>
                    <button onClick={handleWithdraw}
                      disabled={submitting || !wPhone.trim() || !wAmount || parseInt(wAmount) < 1 || parseInt(wAmount) > availableW}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold disabled:opacity-40 transition active:scale-95"
                    >
                      {submitting ? 'Submitting…' : `Withdraw ${wAmount ? (parseInt(wAmount || 0) * PAYOUT_RATE).toLocaleString() + ' XOF' : ''}`}
                    </button>
                    <p className="text-xs text-center text-slate-400">Payouts processed within 24-48 hours</p>
                  </div>
                )}

                {withdrawals.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-slate-700 text-sm mb-2">Previous Withdrawals</h3>
                    {withdrawals.map((w, i) => (
                      <div key={i} className="bg-white rounded-xl border border-slate-100 p-3 flex items-center justify-between mb-2 shadow-sm">
                        <div>
                          <p className="font-semibold text-sm">{w.coins_amount} coins → {w.estimated_xof?.toLocaleString()} XOF</p>
                          <p className="text-xs text-slate-500">{w.payment_method?.toUpperCase()} · {new Date(w.created_at).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${statusStyle(w.status)}`}>{w.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
