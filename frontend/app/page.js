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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('homeHeadline')}</h2>
            <p className="text-lg text-gray-600 mb-8">{t('homeSubtext')}</p>
            <a href="/jobs" className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 text-lg font-semibold">
              {t('exploreJobs')}
            </a>
          </div>
        </div>
      </main>
      <footer className="bg-purple-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-semibold">{t('footerIntro')}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 12.414a2 2 0 00-2.828 0L6.343 16.657m4.586-4.586a4 4 0 115.657 5.657L12 21.414l-4.586-4.586a4 4 0 015.657-5.657z" />
              </svg>
              <p className="mt-2 font-medium">{t('footerLocation')}</p>
            </div>
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 2h2a2 2 0 012 2v16a2 2 0 01-2 2h-2M8 2H6a2 2 0 00-2 2v16a2 2 0 002 2h2m4-18v18" />
              </svg>
              <p className="mt-2 font-medium">{t('footerContact').replace('{{email}}', 'GoArtisans@gmail.com').replace('{{phone}}', '228 93495719')}</p>
            </div>
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l-2 2m0 0l2-2m-2 2h6m0 0l2-2m-2 2v13" />
              </svg>
              <p className="mt-2 font-medium">{t('footerLaunching')}</p>
              <div className="flex justify-center space-x-4 mt-4">
                {/* Google Play icon */}
                <a href="#" className="inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10" viewBox="0 0 512 512">
                    <path fill="white" d="M325.3 234.3L104.1 9.4c-2.4-2.4-6.3-.7-6.3 2.8v488.5c0 3.5 3.9 5.2 6.3 2.8l221.2-224.9c3-3.1 3-8.1 0-11.3z" />
                    <path fill="#A4C639" d="M104.1 502.6l221.2-224.9-84.7-42.6-136.5 267.5z" />
                    <path fill="#3BCCFF" d="M325.3 277.7l84.7-42.6L104.1 9.4v488.5l221.2-224.9z" />
                    <path fill="#FFD400" d="M325.3 234.3l84.7-42.6-84.7-42.6v85.2z" />
                  </svg>
                </a>
                {/* App Store icon */}
                <a href="#" className="inline-block">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10" viewBox="0 0 384 512">
                    <path fill="white" d="M318.7 268c.2-57 46.6-83.9 48.9-85.1-26.7-39-67.8-44.4-82.5-45-35-3.6-68.2 21.1-85.9 21.1-17.8 0-45.5-20.6-74.9-20.1-38.4.5-73.8 22.3-93.5 56.8-39.8 70-10.2 173.6 28.6 230.4 19 28.3 41.6 60 71.5 58.7 28.7-1.3 39.5-18.5 74-18.5 34.4 0 44.5 18.5 74.9 18 30.9-.5 50.4-28.9 69.4-57.3 22-33 31-65 31.5-66.7-.7-.3-60.3-23.1-60.5-91.4zM264.5 59.4c15.1-18.4 25.3-44.1 22.5-69.4-21.8 1-48.3 14.6-64 32.9-14 16.6-26.2 43.3-22.9 68.7 24.3 1.9 49.3-12.4 64.4-32.2z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
