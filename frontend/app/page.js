'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()
  const { t } = useLanguage()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const handleOAuthCallbackFallback = async () => {
      const hash = window.location.hash

      if (hash && hash.length > 1) {
        const params = new URLSearchParams(hash.substring(1))
        const hasOAuthTokens = params.has('access_token') || params.has('refresh_token') || params.has('code')
        const authError = params.get('error_description') || params.get('error')

        if (authError) {
          router.replace(`/login?error=${encodeURIComponent(authError)}`)
          return
        }

        if (hasOAuthTokens) {
          // Ensure Supabase processes hash tokens before role-based redirecting.
          await supabase.auth.getSession()
          router.replace('/auth-success')
          return
        }
      }

      // Only show home page when not in an auth callback flow.
      setIsChecking(false)
    }

    handleOAuthCallbackFallback()
  }, [router])

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600 font-semibold">Loading...</div>
  }

  return (
    <>
      <main className="min-h-screen pt-12 pb-16 sm:pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-surface rounded-3xl p-8 sm:p-12 border border-white/80 fade-in-up overflow-hidden relative">
            <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-blue-200/40 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-emerald-200/40 blur-3xl" aria-hidden="true" />

            <div className="relative text-center max-w-3xl mx-auto">
              <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs sm:text-sm font-semibold tracking-wide mb-5">
                Trusted Local Talent Network
              </p>
              <h2 className="display-font text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-5 leading-tight">
                {t('homeHeadline')}
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
                {t('homeSubtext')}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href="/jobs" className="primary-action px-8 py-3 rounded-xl text-lg font-semibold shadow-lg shadow-blue-500/20 interactive-rise">
                  {t('exploreJobs')}
                </a>
                <a href="/browse-workers" className="px-8 py-3 rounded-xl text-lg font-semibold bg-white text-slate-700 border border-slate-300 hover:border-blue-300 hover:text-blue-700 interactive-rise">
                  {t('browseWorkers')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-slate-900 text-slate-100 py-14 mt-8 border-t border-slate-700/60">
        <div className="footer-premium">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="footer-glow footer-glow-left" />
            <div className="footer-glow footer-glow-right" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="footer-top grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              <div className="lg:col-span-5 footer-panel footer-reveal text-left">
                <p className="footer-tag">GoArtisans</p>
                <h3 className="display-font text-2xl sm:text-3xl font-semibold text-white leading-tight mt-3">
                  {t('footerIntro')}
                </h3>
                <p className="text-slate-300 text-sm sm:text-base mt-4 leading-relaxed">
                  {t('footerLaunching')}
                </p>
              </div>

              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="footer-card footer-reveal">
                  <div className="footer-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 footer-icon-shell" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <circle className="footer-icon-ring" cx="12" cy="12" r="9" strokeWidth="1.6" />
                      <path className="footer-icon-pin" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.7c-3.18 0-5.75 2.57-5.75 5.75 0 4.48 5.02 8.67 5.24 8.85a.8.8 0 001.02 0c.22-.18 5.24-4.37 5.24-8.85 0-3.18-2.57-5.75-5.75-5.75z" />
                      <circle className="footer-icon-pulse" cx="12" cy="10.45" r="1.95" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="footer-card-title">{t('footerLocalOffice')}</p>
                  <p className="footer-card-text">{t('footerLocation')}</p>
                </div>

                <div className="footer-card footer-reveal">
                  <div className="footer-icon-wrap">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 footer-icon-shell" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <rect className="footer-icon-mail" x="4" y="6" width="16" height="12" rx="2.2" strokeWidth="1.8" />
                      <path className="footer-icon-mail" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.6 8.1l6.4 4.9 6.4-4.9" />
                      <path className="footer-icon-at" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M14.7 11.95a2.7 2.7 0 11-1.1-2.16v2.34c0 .5.4.9.9.9h.05c1.3 0 2.35-1.2 2.22-2.56a4.9 4.9 0 10-1.7 3.3" />
                    </svg>
                  </div>
                  <p className="footer-card-title">{t('footerContactLabel')}</p>
                  <p className="footer-card-text">{t('footerContact').replace('{{email}}', 'GoArtisans7@gmail.com').replace('{{phone}}', '228 93495719')}</p>
                </div>
              </div>
            </div>

            <div className="footer-app-row mt-6 sm:mt-8">
              <a href="#" className="store-badge footer-reveal" aria-label="Download on Google Play">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 shrink-0" viewBox="0 0 512 512">
                  <path fill="white" d="M325.3 234.3L104.1 9.4c-2.4-2.4-6.3-.7-6.3 2.8v488.5c0 3.5 3.9 5.2 6.3 2.8l221.2-224.9c3-3.1 3-8.1 0-11.3z" />
                  <path fill="#A4C639" d="M104.1 502.6l221.2-224.9-84.7-42.6-136.5 267.5z" />
                  <path fill="#3BCCFF" d="M325.3 277.7l84.7-42.6L104.1 9.4v488.5l221.2-224.9z" />
                  <path fill="#FFD400" d="M325.3 234.3l84.7-42.6-84.7-42.6v85.2z" />
                </svg>
                <span className="store-copy">
                  <span className="store-small">{t('footerStoreGetItOn')}</span>
                  <span className="store-large">{t('footerStoreGooglePlay')}</span>
                </span>
              </a>

              <a href="#" className="store-badge footer-reveal" aria-label="Download on the App Store">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 shrink-0" viewBox="0 0 384 512">
                  <path fill="white" d="M318.7 268c.2-57 46.6-83.9 48.9-85.1-26.7-39-67.8-44.4-82.5-45-35-3.6-68.2 21.1-85.9 21.1-17.8 0-45.5-20.6-74.9-20.1-38.4.5-73.8 22.3-93.5 56.8-39.8 70-10.2 173.6 28.6 230.4 19 28.3 41.6 60 71.5 58.7 28.7-1.3 39.5-18.5 74-18.5 34.4 0 44.5 18.5 74.9 18 30.9-.5 50.4-28.9 69.4-57.3 22-33 31-65 31.5-66.7-.7-.3-60.3-23.1-60.5-91.4zM264.5 59.4c15.1-18.4 25.3-44.1 22.5-69.4-21.8 1-48.3 14.6-64 32.9-14 16.6-26.2 43.3-22.9 68.7 24.3 1.9 49.3-12.4 64.4-32.2z" />
                </svg>
                <span className="store-copy">
                  <span className="store-small">{t('footerStoreDownloadOn')}</span>
                  <span className="store-large">{t('footerStoreAppStore')}</span>
                </span>
              </a>
            </div>

            <div className="footer-bottom footer-reveal mt-8 pt-5">
              <p className="text-xs sm:text-sm text-slate-400">© {new Date().getFullYear()} GoArtisans</p>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-300 animate-pulse" aria-hidden="true" />
                <span>{t('footerPlatformUpdates')}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
