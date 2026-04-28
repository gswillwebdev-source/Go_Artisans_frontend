/**
 * ReferralBadge — shows a user's referral tier as stars + label under their name.
 *
 * Tiers (based on successful referrals):
 *   50+   → ⭐          Starter
 *   150+  → ⭐⭐        Advocate
 *   250+  → ⭐⭐⭐      Promoter
 *   350+  → ⭐⭐⭐⭐    Champion
 *   1000+ → ⭐⭐⭐⭐⭐  Legend
 *
 * Usage: <ReferralBadge count={120} />
 *        <ReferralBadge tier={{ label: 'Advocate', stars: 2 }} />
 */

const TIERS = [
    { min: 1000, label: 'Legend', stars: 5, color: 'text-purple-600' },
    { min: 350, label: 'Champion', stars: 4, color: 'text-blue-600' },
    { min: 250, label: 'Promoter', stars: 3, color: 'text-indigo-600' },
    { min: 150, label: 'Advocate', stars: 2, color: 'text-emerald-600' },
    { min: 50, label: 'Starter', stars: 1, color: 'text-amber-600' },
]

export function getReferralTier(count = 0) {
    return TIERS.find(t => count >= t.min) ?? null
}

export default function ReferralBadge({ count, tier: tierProp, className = '' }) {
    const tier = tierProp ?? getReferralTier(count ?? 0)
    if (!tier || tier.stars === 0) return null

    return (
        <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${tier.color} ${className}`}
            title={`${tier.label} — ${count ?? '?'} referrals`}
        >
            {'⭐'.repeat(tier.stars)}
            <span className="ml-0.5">{tier.label}</span>
        </span>
    )
}
