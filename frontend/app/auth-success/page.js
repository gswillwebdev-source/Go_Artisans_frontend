'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthSuccessPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const token = searchParams.get('token')
        const userStr = searchParams.get('user')

        if (token) {
            localStorage.setItem('token', token)
            if (userStr) {
                try {
                    const user = JSON.parse(decodeURIComponent(userStr))
                    localStorage.setItem('user', JSON.stringify(user))
                } catch (err) {
                    console.error('Failed to parse user data:', err)
                }
            }
            // Redirect to home or dashboard
            router.push('/jobs')
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
