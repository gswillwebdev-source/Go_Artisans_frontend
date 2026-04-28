/**
 * PlanBadge — displays a user's subscription tier badge and/or verification checkmark.
 *
 * Props:
 *   planTier    'free' | 'pro' | 'premium'    — subscription tier
 *   isVerified  boolean                        — blue verified checkmark
 *   size        'sm' | 'md' | 'lg'            — default 'md'
 *   showLabel   boolean                        — show text label alongside icon
 */
export default function PlanBadge({ planTier = 'free', isVerified = false, size = 'md', showLabel = false }) {
    const sizeMap = {
        sm: { icon: 'text-xs', wrap: 'px-1.5 py-0.5 gap-1', text: 'text-xs' },
        md: { icon: 'text-sm', wrap: 'px-2 py-0.5 gap-1', text: 'text-xs' },
        lg: { icon: 'text-base', wrap: 'px-2.5 py-1 gap-1.5', text: 'text-sm' },
    }
    const s = sizeMap[size] || sizeMap.md

    return (
        <span className="inline-flex items-center gap-1">
            {/* Subscription tier badge */}
            {planTier === 'premium' && (
                <span
                    className={`inline-flex items-center ${s.wrap} rounded-full font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-sm`}
                    title="Premium member"
                >
                    <span className={s.icon}>💎</span>
                    {showLabel && <span className={s.text}>Premium</span>}
                </span>
            )}

            {planTier === 'pro' && (
                <span
                    className={`inline-flex items-center ${s.wrap} rounded-full font-semibold bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-sm`}
                    title="Pro member"
                >
                    <span className={s.icon}>⭐</span>
                    {showLabel && <span className={s.text}>Pro</span>}
                </span>
            )}

            {/* Verified blue checkmark */}
            {isVerified && (
                <span
                    className={`inline-flex items-center ${s.wrap} rounded-full font-semibold bg-blue-500 text-white shadow-sm`}
                    title="Verified account"
                >
                    <span className={s.icon}>✓</span>
                    {showLabel && <span className={s.text}>Verified</span>}
                </span>
            )}
        </span>
    )
}
