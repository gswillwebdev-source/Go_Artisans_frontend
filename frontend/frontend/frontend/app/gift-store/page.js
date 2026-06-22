'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const PACKS = [
  { id: 'p1', coins: 110, xof: 500, label: 'Starter', emoji: '🪙', bonus: null, popular: false },
  { id: 'p2', coins: 600, xof: 2500, label: 'Regular', emoji: '💰', bonus: '+10%', popular: false },
  { id: 'p3', coins: 1320, xof: 5000, label: 'Popular 🔥', emoji: '🔥', bonus: '+20%', popular: true },
  { id: 'p4', coins: 4200, xof: 15000, label: 'Best Value', emoji: '💎', bonus: '+40%', popular: false },
  { id: 'p5', coins: 10000, xof: 35000, label: 'Creator 🚀', emoji: '🚀', bonus: '+80%', popular: false },
]

const METHODS = [
  { id: 'mtn', label: 'MTN Mobile Money', icon: '📱' },
  { id: 'moov', label: 'Moov Money', icon: '📱' },
  { id: 'orange', label: 'Orange Money', icon: '📱' },
  { id: 'visa', label: 'Visa / Mastercard', icon: '💳' },
]

export default function GiftStore() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [balance, setBalance] = useState(0)
  const [pack, setPack] = useState(null)
  const [method, setMethod] = useState(null)
  const [phone, setPhone] = useState('')
  const [step, setStep] = useState(1)   // 1=packs 2=payment 3=done
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setUser(session.user)
      supabase.from('user_coins').select('balance').eq('user_id', session.user.id).single()
        .then(({ data }) => { setBalance(data?.balance ?? 0); setLoading(false) })
    })
  }, [router])

  const handlePay = async () => {
    if (!pack || !method) return
    const isMobile = method !== 'visa'
    if (isMobile && !phone.trim()) return
    setBuying(true)
    setErrorMsg('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Please log in again to continue.')

      // 1. Create pending purchase record
      const { data: purchase, error: insertErr } = await supabase.from('coin_purchases').insert({
        user_id: user.id,
        coins_amount: pack.coins,
        price_xof: pack.xof,
        payment_method: method,
        phone_number: isMobile ? phone.trim() : null,
        status: 'pending',
      }).select().single()

      if (insertErr) throw insertErr

      // 2. For mobile money & visa: redirect to FedaPay checkout
      // The webhook will mark purchase as 'completed' and credit coins
      const backendUrlRaw = process.env.NEXT_PUBLIC_API_URL || 'https://api.goartisans.online'
      const backendUrl = backendUrlRaw.replace(/\/+$/, '')
      const apiBase = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`
      const checkoutEndpoints = [
        `${apiBase}/subscriptions/fedapay/coin-checkout`,
        `${apiBase}/coins/fedapay/checkout`,
      ]

      const payload = {
        purchase_id: purchase.id,
        coins_amount: pack.coins,
        price_xof: pack.xof,
        payment_method: method,
        phone_number: isMobile ? phone.trim() : null,
      }

      let data = null
      let lastError = 'Unable to start FedaPay checkout.'

      for (const endpoint of checkoutEndpoints) {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        })

        const raw = await response.text()
        let parsed = null
        try {
          parsed = raw ? JSON.parse(raw) : null
        } catch {
          const preview = raw?.slice(0, 120) || 'empty response'
          lastError = `Payment service returned an invalid response (${response.status}) at ${endpoint}. Response preview: ${preview}`
          continue
        }

        if (!response.ok) {
          lastError = parsed?.error || `Checkout failed (${response.status}) at ${endpoint}`
          // If route is missing, try fallback endpoint.
          if (response.status === 404) continue
          throw new Error(lastError)
        }

        data = parsed
        break
      }

      if (!data) throw new Error(lastError)

      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error('Failed to create checkout')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setErrorMsg(err.message || 'Failed to initialize payment.')
      setBuying(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-0)]">
      <div className="h-8 w-8 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[var(--bg-0)] py-8 px-4 pb-24">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/gift-box" className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition" aria-label="Back">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--ink-900)]">Coin Store 🪙</h1>
            <p className="text-sm text-[var(--ink-500)]">Balance: <span className="text-yellow-500 font-bold">{balance.toLocaleString()} coins</span></p>
          </div>
          <Link href="/gift-box" className="text-sm text-blue-600 hover:underline font-semibold">My Gift Box →</Link>
        </div>

        {/* Step 1 — Choose pack */}
        {step === 1 && (
          <>
            <p className="text-sm text-[var(--ink-500)] mb-4">Choose a coin pack to send gifts to your favourite creators</p>
            <div className="space-y-3">
              {PACKS.map(p => (
                <button key={p.id} onClick={() => { setPack(p); setStep(2) }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-slate-200 bg-white hover:border-yellow-300 transition relative overflow-hidden"
                >
                  {p.popular && (
                    <span className="absolute top-0 right-0 bg-gradient-to-r from-orange-400 to-pink-500 text-white text-[10px] font-bold px-3 py-0.5 rounded-bl-xl">POPULAR</span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{p.emoji}</span>
                    <div className="text-left">
                      <p className="font-bold text-slate-900">{p.label}</p>
                      <p className="text-sm text-slate-600 font-semibold">
                        {p.coins.toLocaleString()} coins
                        {p.bonus && <span className="text-green-600 ml-1">{p.bonus}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right pr-6 sm:pr-0">
                    <p className="font-bold text-slate-900 text-lg">{p.xof.toLocaleString()} XOF</p>
                    <p className="text-xs text-slate-500">≈ ${(p.xof / 620).toFixed(2)} USD</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2 — Payment */}
        {step === 2 && pack && (
          <>
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Purchasing</p>
                <p className="font-bold text-xl text-slate-900">{pack.emoji} {pack.coins.toLocaleString()} coins</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-2xl text-slate-900">{pack.xof.toLocaleString()} XOF</p>
                <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline">Change</button>
              </div>
            </div>

            <p className="text-sm font-semibold text-slate-700 mb-3">Payment Method</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {METHODS.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition text-sm font-semibold ${method === m.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                    }`}
                >
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-xs leading-tight">{m.label}</span>
                </button>
              ))}
            </div>

            {method && method !== 'visa' && (
              <div className="mb-5">
                <label className="text-sm font-semibold text-slate-700 block mb-1.5">Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +228 90 XX XX XX"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 outline-none text-slate-900 font-semibold text-lg"
                />
              </div>
            )}

            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-600">
                After you click confirm, you will be redirected to FedaPay where payment is confirmed securely.
                For mobile money, FedaPay will request the provider confirmation (PIN/secret code/OTP). For card, FedaPay will collect card verification directly.
              </p>
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
            )}

            <button onClick={handlePay}
              disabled={!method || buying || (method !== 'visa' ? !phone.trim() : false)}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-lg shadow-lg shadow-orange-200 disabled:opacity-40 transition active:scale-95"
            >
              {buying ? 'Redirecting to FedaPay…' : `Confirm Purchase ${pack.xof.toLocaleString()} XOF`}
            </button>
            <p className="text-xs text-center text-slate-400 mt-3">🔒 Secure payment via FedaPay · Coins delivered only after payment confirmation</p>
          </>
        )}

        {/* Step 3 — Success */}
        {step === 3 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Payment Successful!</h2>
            <p className="text-slate-600 mb-1">You received <span className="font-bold text-yellow-500">{pack?.coins.toLocaleString()} coins</span></p>
            <p className="text-slate-500 text-sm mb-8">New balance: <span className="font-bold text-slate-800">{balance.toLocaleString()} 🪙</span></p>
            <div className="flex flex-col gap-3">
              <Link href="/videos" className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-center hover:bg-blue-700 transition">🎁 Send Gifts Now</Link>
              <Link href="/gift-box" className="w-full py-3 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold text-center hover:bg-slate-50 transition">My Gift Box</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
