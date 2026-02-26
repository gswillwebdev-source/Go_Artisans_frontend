'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from 'axios'
import { useRouter } from 'next/navigation'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isChecking, setIsChecking] = useState(true)
    const [step, setStep] = useState(1) // 1: request, 2: success message

    useEffect(() => {
        // Check if user is already logged in
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null

        if (token && userData) {
            try {
                const user = JSON.parse(userData)
                // Redirect logged-in users to their profile
                if (user.userType === 'worker') {
                    router.push('/worker-profile')
                } else if (user.userType === 'client') {
                    router.push('/client-profile')
                } else {
                    router.push('/choose-role')
                }
            } catch (e) {
                console.error('Error parsing user data:', e)
                setIsChecking(false)
            }
        } else {
            setIsChecking(false)
        }
    }, [router])

    const handleRequestReset = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`,
                { email }
            )
            setSuccess('We sent you an email with a password reset link. Please check your inbox (and spam folder).')
            setStep(2)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to process reset request')
        }
        setLoading(false)
    }

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
                <p className="text-gray-600 mb-8">
                    {step === 1 && 'Enter your email address and we\'ll send you a link to reset your password'}
                    {step === 2 && 'Check your email for the password reset link'}
                </p>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}

                {step === 1 ? (
                    <form onSubmit={handleRequestReset} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                placeholder="you@example.com"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                            <p className="font-semibold mb-2">Email sent!</p>
                            <p>We've sent a password reset link to <strong>{email}</strong></p>
                            <p className="mt-2">Click the link in the email to reset your password. The link expires in 1 hour.</p>
                        </div>
                        <button
                            onClick={() => {
                                setStep(1)
                                setEmail('')
                                setSuccess('')
                            }}
                            className="w-full text-indigo-600 hover:underline font-semibold py-2"
                        >
                            Try another email
                        </button>
                    </div>
                )}

                <p className="text-center text-gray-600 mt-6 text-sm">
                    <Link href="/login" className="text-indigo-600 hover:underline font-semibold">
                        Back to login
                    </Link>
                </p>
            </div>
        </div>
    )
}