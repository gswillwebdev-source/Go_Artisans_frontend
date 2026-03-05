'use client'

import { Suspense } from 'react'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthSuccessContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const token = searchParams.get('token')
        const userStr = searchParams.get('user')

        if (token) {
            localStorage.setItem('token', token)
            let user = null
            if (userStr) {
                try {
                    user = JSON.parse(decodeURIComponent(userStr))
                    localStorage.setItem('user', JSON.stringify(user))
                } catch (err) {
                    console.error('Failed to parse user data:', err)
                }
            }

            // Redirect based on user role
            if (user?.userType === 'worker') {
                router.push('/worker-profile')
            } else if (user?.userType === 'client') {
                router.push('/client-profile')
            } else {
                // No role assigned yet, show role selection
                router.push('/choose-role')
            }
        } else {
            router.push('/login')
        }
    }, [searchParams, router])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
                <p className="text-gray-600">Please wait while we complete your login.</p>
            </div>
        </div>
    )
}

export default function AuthSuccessPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Loading...</h2>
                </div>
            </div>
        }>
            <AuthSuccessContent />
        </Suspense>
    )
}
