'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function VerifyEmailPage() {
    const router = useRouter()
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [isChecking, setIsChecking] = useState(true)
    const [resendLoading, setResendLoading] = useState(false)
    const [resendError, setResendError] = useState('')
    const [resendSuccess, setResendSuccess] = useState(false)
    const [resendCooldown, setResendCooldown] = useState(0)

    useEffect(() => {
        // Check if user is logged in and email is verified
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                router.push('/login')
                return
            }

            // Check if email is already verified
            if (session.user.email_confirmed_at) {
                router.push('/choose-role')
                return
            }

            setIsChecking(false)
        }

        checkUser()
    }, [router])

    // Handle resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [resendCooldown])

    const handleResendCode = async () => {
        setResendLoading(true)
        setResendError('')
        setResendSuccess(false)

        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: (await supabase.auth.getUser()).data.user?.email
            })

            if (error) {
                setResendError(error.message)
            } else {
                setResendSuccess(true)
                setResendCooldown(60) // 60 second cooldown
            }
        } catch (err) {
            setResendError('Failed to resend verification email')
        } finally {
            setResendLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Refresh the session to check if email is now verified
            const { data: { session }, error } = await supabase.auth.getSession()

            if (error) {
                setError(error.message)
            } else if (session?.user.email_confirmed_at) {
                setSuccess(true)
                setTimeout(() => {
                    router.push('/choose-role')
                }, 2000)
            } else {
                setError('Email not yet verified. Please check your email and click the verification link.')
            }
        } catch (err) {
            setError('Verification check failed')
        } finally {
            setLoading(false)
        }
    }

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
                <p className="text-gray-600 mb-8">We sent a 6-digit code to your email address</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
                        {error}
                        {(error.toLowerCase().includes('expired') || error.toLowerCase().includes('invalid')) && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                                <button
                                    onClick={handleResendCode}
                                    disabled={resendLoading || resendCooldown > 0}
                                    className="text-red-700 hover:text-red-800 font-semibold underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resendLoading ? 'Sending...' : '→ Get a new code'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">Email verified successfully! Redirecting...</div>}

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                        <input
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            maxLength="6"
                            placeholder="000000"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-center text-2xl letter-spacing tracking-widest font-mono"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2">Enter the 6-digit code from your email</p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || code.length !== 6}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                </form>

                <div className="text-center border-t border-gray-200 pt-6">
                    <p className="text-gray-700 text-sm font-medium mb-4">Need a new code?</p>
                    {resendSuccess && (
                        <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm border border-green-200">
                            ✓ Verification code sent! Check your email.
                        </div>
                    )}
                    {resendError && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
                            {resendError}
                        </div>
                    )}
                    <button
                        onClick={handleResendCode}
                        disabled={resendLoading || resendCooldown > 0}
                        className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition border border-blue-200"
                    >
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resendLoading ? 'Sending...' : 'Resend Verification Code'}
                    </button>
                    <p className="text-gray-500 text-xs mt-3">
                        The code expires after 15 minutes. Click above to request a new one.
                    </p>
                </div>
            </div>
        </div>
    )
}
