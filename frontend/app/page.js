'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

      if (token && userData) {
        try {
          const user = JSON.parse(userData)
          // If user is logged in, redirect to their profile
          if (user.userType === 'worker') {
            router.push('/worker-profile')
          } else if (user.userType === 'client') {
            router.push('/client-profile')
          } else {
            // User has no role assigned yet
            router.push('/choose-role')
          }
        } catch (e) {
          console.error('Error parsing user data:', e)
          setIsChecking(false)
        }
      } else {
        // User is not logged in, show home page
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router])

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Find Your Next Opportunity</h2>
          <p className="text-lg text-gray-600 mb-8">Discover thousands of job listings and connect with top employers</p>
          <a href="/jobs" className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 text-lg font-semibold">
            Explore Jobs
          </a>
        </div>
      </div>
    </main>
  )
}
