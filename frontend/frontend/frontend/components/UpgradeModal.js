'use client'

import { useRouter } from 'next/navigation'

/**
 * UpgradeModal — shown when a free user tries to access a gated feature.
 *
 * Props:
 *   isOpen   {boolean}  — controls visibility
 *   onClose  {fn}       — called when user dismisses the modal
 *   feature  {string}   — short label for what's locked ("WhatsApp contact", "extra job applications", …)
 *   planNeeded {string} — "pro" | "premium" (default "pro")
 */
export default function UpgradeModal({ isOpen, onClose, feature = 'this feature', planNeeded = 'pro' }) {
    const router = useRouter()

    if (!isOpen) return null

    const planLabel = planNeeded === 'premium' ? 'Premium' : 'Pro'
    const planColor = planNeeded === 'premium' ? 'purple' : 'blue'

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none"
                    aria-label="Close"
                >
                    ✕
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl ${planNeeded === 'premium' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                        🔒
                    </div>
                </div>

                {/* Heading */}
                <h2 className="text-xl font-extrabold text-gray-900 text-center mb-2">
                    Unlock {feature}
                </h2>
                <p className="text-sm text-gray-500 text-center mb-5">
                    This feature requires a <strong>{planLabel}</strong> plan or higher. Upgrade now to get full access to contacts, unlimited applications, and more.
                </p>

                {/* Feature bullets */}
                <ul className="space-y-2 mb-6">
                    {[
                        'See WhatsApp & contact info of users',
                        'Unlimited job applications per month',
                        'Priority search ranking',
                        planNeeded === 'premium' ? 'AI-powered job matching' : '⭐ Pro badge on your profile',
                    ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className={planNeeded === 'premium' ? 'text-purple-500' : 'text-blue-500'}>✓</span>
                            {item}
                        </li>
                    ))}
                </ul>

                {/* CTA */}
                <button
                    onClick={() => { onClose(); router.push('/pricing') }}
                    className={`w-full py-3 rounded-xl font-bold text-white transition mb-3 ${planNeeded === 'premium'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    Upgrade to {planLabel} →
                </button>
                <button
                    onClick={onClose}
                    className="w-full py-2 rounded-xl text-gray-500 text-sm hover:text-gray-700 transition"
                >
                    Maybe later
                </button>
            </div>
        </div>
    )
}
