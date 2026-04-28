'use client'

import { useEffect, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Replace with your real AdSense Publisher ID and Ad Slot ID from
// https://adsense.google.com → My ads → Create ad unit
// Publisher ID format:  ca-pub-XXXXXXXXXXXXXXXX
// Ad Slot ID format:    YYYYYYYYYY  (10-digit number)
// ─────────────────────────────────────────────────────────────────────────────
const PUBLISHER_ID = 'ca-pub-2138089895232822'
// Replace DEFAULT_SLOT with your 10-digit Ad Unit ID from AdSense → My ads → Create ad unit
const DEFAULT_SLOT = '4896240667'

export default function AdBanner({
    slot = DEFAULT_SLOT,
    format = 'auto',
    fullWidthResponsive = true,
    className = '',
}) {
    const adRef = useRef(null)

    useEffect(() => {
        // Load the AdSense script once via vanilla DOM — no next/script, no hydration mismatch
        if (!document.querySelector(`script[src*="adsbygoogle.js"]`)) {
            const s = document.createElement('script')
            s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PUBLISHER_ID}`
            s.async = true
            s.crossOrigin = 'anonymous'
            document.head.appendChild(s)
        }
        try {
            ; (window.adsbygoogle = window.adsbygoogle || []).push({})
        } catch {
            // ad already initialized or blocked — safe to ignore
        }
    }, [])

    return (
        <div className={`w-full flex justify-center my-4 ${className}`}>
            <ins
                ref={adRef}
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={PUBLISHER_ID}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={String(fullWidthResponsive)}
            />
        </div>
    )
}
