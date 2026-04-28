'use client'

import { useSubscription } from '@/context/SubscriptionContext'
import AdBanner from '@/components/AdBanner'

/**
 * Shows the AdBanner only for free-tier users.
 * Pro / Premium users see no ads.
 * Accepts all AdBanner props (slot, format, className).
 */
export default function ConditionalAdBanner(props) {
    const { isFree, loading } = useSubscription()

    // Don't flash an ad during the subscription loading check
    if (loading) return null

    if (!isFree) return null

    return <AdBanner {...props} />
}
