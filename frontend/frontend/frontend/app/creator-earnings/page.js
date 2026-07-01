'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const VIEWS_PER_MILESTONE = 1000
const XOF_PER_MILESTONE = 500
const WITHDRAW_FEE_RATE = 0.2

const getMonthStartIso = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

const calcGiftGrossXof = (coins) => Math.round((Number(coins || 0) * 22727) / 5000)
const calcGiftFeeXof = (gross) => Math.round(Number(gross || 0) * WITHDRAW_FEE_RATE)
const calcGiftNetXof = (coins) => {
  const gross = calcGiftGrossXof(coins)
  return Math.max(0, gross - calcGiftFeeXof(gross))
}

function StatCard({ label, value, sub, tone = 'slate' }) {
  const tones = {
    slate: 'border-slate-200 bg-white',
    yellow: 'border-yellow-200 bg-yellow-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    violet: 'border-violet-200 bg-violet-50',
  }

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${tones[tone] || tones.slate}`}>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
      {sub ? <p className="text-xs text-slate-500 mt-2">{sub}</p> : null}
    </div>
  )
}

export default function CreatorEarningsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [gifts, setGifts] = useState([])
  const [viewEvents, setViewEvents] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [videoMap, setVideoMap] = useState({})
  const [viewTotals, setViewTotals] = useState(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace('/login')
        return
      }

      const uid = session.user.id

      const [giftRes, eventRes, totalsRes, withdrawalsRes, videosRes] = await Promise.all([
        supabase
          .from('video_gifts')
          .select('id,gift_name,gift_emoji,gift_cost,created_at,sender:sender_id(first_name,last_name)')
          .eq('recipient_id', uid)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('creator_view_earning_events')
          .select('id,video_id,milestone_count,views_paid,gross_xof_earned,created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('creator_view_earnings')
          .select('total_views_paid,total_milestones,gross_xof_earned')
          .eq('user_id', uid)
          .maybeSingle(),
        supabase
          .from('gift_withdrawals')
          .select('id,coins_amount,gross_xof,platform_fee_xof,payout_xof,status,created_at,paid_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .limit(30),
        supabase
          .from('videos')
          .select('id,caption')
          .eq('user_id', uid)
          .limit(200),
      ])

      setGifts(giftRes.data ?? [])
      setViewEvents(eventRes.data ?? [])
      setViewTotals(totalsRes.data ?? null)
      setWithdrawals(withdrawalsRes.data ?? [])
      setVideoMap(Object.fromEntries((videosRes.data ?? []).map(video => [video.id, video.caption || 'Untitled video'])))
      setLoading(false)
    }

    load()
  }, [router])

  const monthStart = useMemo(() => getMonthStartIso(), [])

  const giftLifetimeCoins = gifts.reduce((sum, gift) => sum + (gift.gift_cost ?? 0), 0)
  const giftMonthCoins = gifts
    .filter(gift => gift.created_at >= monthStart)
    .reduce((sum, gift) => sum + (gift.gift_cost ?? 0), 0)

  const viewLifetimeGross = viewTotals?.gross_xof_earned ?? viewEvents.reduce((sum, event) => sum + (event.gross_xof_earned ?? 0), 0)
  const viewLifetimeMilestones = viewTotals?.total_milestones ?? viewEvents.reduce((sum, event) => sum + (event.milestone_count ?? 0), 0)
  const viewLifetimePaidViews = viewTotals?.total_views_paid ?? viewEvents.reduce((sum, event) => sum + (event.views_paid ?? 0), 0)

  const monthViewEvents = viewEvents.filter(event => event.created_at >= monthStart)
  const viewMonthGross = monthViewEvents.reduce((sum, event) => sum + (event.gross_xof_earned ?? 0), 0)
  const viewMonthMilestones = monthViewEvents.reduce((sum, event) => sum + (event.milestone_count ?? 0), 0)
  const viewMonthPaidViews = monthViewEvents.reduce((sum, event) => sum + (event.views_paid ?? 0), 0)

  const paidWithdrawalsNet = withdrawals
    .filter(withdrawal => withdrawal.status === 'paid')
    .reduce((sum, withdrawal) => sum + (withdrawal.payout_xof ?? 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-0)]">
        <div className="h-10 w-10 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-0)] px-4 py-8 pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/creator-dashboard" className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex-1 min-w-[240px]">
            <h1 className="text-3xl font-bold text-[var(--ink-900)]">Creator Earnings Ledger</h1>
            <p className="text-sm text-[var(--ink-500)] mt-1">Track gift earnings, view monetization milestones, and payout history.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/videos/upload" className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition">Post More</Link>
            <Link href="/gift-box?tab=withdraw" className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-700 transition">Withdraw</Link>
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-cyan-50 p-6 shadow-sm">
          <p className="text-sm font-semibold text-emerald-800">Growth note</p>
          <p className="text-lg font-bold text-slate-900 mt-1">Every {VIEWS_PER_MILESTONE.toLocaleString()} views unlocks {XOF_PER_MILESTONE.toLocaleString()} XOF gross.</p>
          <p className="text-sm text-slate-700 mt-2">Push creators to share videos aggressively so viewers download the app, register, and keep the view loop growing.</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Gift Earnings</h2>
              <p className="text-sm text-slate-500">Coins received from supporters on videos.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Lifetime Gift Coins" value={`${giftLifetimeCoins.toLocaleString()} 🪙`} sub={`Estimated net payout ${calcGiftNetXof(giftLifetimeCoins).toLocaleString()} XOF`} tone="yellow" />
            <StatCard label="This Month Gift Coins" value={`${giftMonthCoins.toLocaleString()} 🪙`} sub={`Estimated net payout ${calcGiftNetXof(giftMonthCoins).toLocaleString()} XOF`} tone="yellow" />
            <StatCard label="Lifetime Gift Gross" value={`${calcGiftGrossXof(giftLifetimeCoins).toLocaleString()} XOF`} sub={`Fee ${calcGiftFeeXof(calcGiftGrossXof(giftLifetimeCoins)).toLocaleString()} XOF`} tone="violet" />
            <StatCard label="Paid Out So Far" value={`${paidWithdrawalsNet.toLocaleString()} XOF`} sub="Completed withdrawals only" tone="slate" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Gift Earnings</h3>
            </div>
            {gifts.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-500">No gift earnings yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {gifts.map(gift => (
                  <div key={gift.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{gift.gift_emoji} {gift.gift_name}</p>
                      <p className="text-xs text-slate-500">From {gift.sender?.first_name || 'A user'} {gift.sender?.last_name || ''} · {new Date(gift.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">+{gift.gift_cost} coins</p>
                      <p className="text-xs text-slate-500">Net est. {calcGiftNetXof(gift.gift_cost).toLocaleString()} XOF</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Views Earnings</h2>
            <p className="text-sm text-slate-500">Milestone payouts generated automatically from unique views.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Lifetime View Earnings" value={`${viewLifetimeGross.toLocaleString()} XOF`} sub={`${viewLifetimeMilestones.toLocaleString()} milestones · ${viewLifetimePaidViews.toLocaleString()} paid views`} tone="emerald" />
            <StatCard label="This Month View Earnings" value={`${viewMonthGross.toLocaleString()} XOF`} sub={`${viewMonthMilestones.toLocaleString()} milestones · ${viewMonthPaidViews.toLocaleString()} paid views`} tone="emerald" />
            <StatCard label="Current Rule" value={`${VIEWS_PER_MILESTONE.toLocaleString()} views`} sub={`${XOF_PER_MILESTONE.toLocaleString()} XOF gross each milestone`} tone="slate" />
            <StatCard label="Scale Reference" value="1k / 1m / 1b" sub="1,000 / 1,000,000 / 1,000,000,000 views" tone="slate" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent View Milestone Events</h3>
            </div>
            {viewEvents.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-500">No view milestones reached yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {viewEvents.map(event => (
                  <div key={event.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900 truncate max-w-[320px]">{videoMap[event.video_id] || 'Untitled video'}</p>
                      <p className="text-xs text-slate-500">{event.milestone_count} milestone{event.milestone_count > 1 ? 's' : ''} · {event.views_paid.toLocaleString()} views paid · {new Date(event.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-700">+{event.gross_xof_earned.toLocaleString()} XOF</p>
                      <p className="text-xs text-slate-500">{event.milestone_count} × {XOF_PER_MILESTONE.toLocaleString()} XOF</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Withdrawal History</h2>
            <p className="text-sm text-slate-500">What has already been requested and paid out.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {withdrawals.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-500">No withdrawals yet.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {withdrawals.map(withdrawal => (
                  <div key={withdrawal.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{withdrawal.coins_amount.toLocaleString()} coins</p>
                      <p className="text-xs text-slate-500">Requested {new Date(withdrawal.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-violet-700">{(withdrawal.payout_xof ?? 0).toLocaleString()} XOF net</p>
                      <p className="text-xs text-slate-500">Gross {(withdrawal.gross_xof ?? 0).toLocaleString()} · Fee {(withdrawal.platform_fee_xof ?? 0).toLocaleString()} · {withdrawal.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}