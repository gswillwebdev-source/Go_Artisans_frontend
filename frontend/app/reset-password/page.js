'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
    const router = useRouter()

    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [isValidToken, setIsValidToken] = useState(false)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        // Only run on client, after hydration
        setHydrated(true)

        // Parse URL hash for Supabase error parameters
        const hash = window.location.hash
        const params = new URLSearchParams(hash.substring(1))

        const errorCode = params.get('error_code')
        const errorDescription = params.get('error_description')
        const token = params.get('access_token')

        if (errorCode || errorDescription) {
            // User has an expired or invalid token
            if (errorCode === 'otp_expired') {
                setError('Email link is invalid or has expired. Please request a new password reset.')
            } else {
                setError(errorDescription || 'Invalid reset link. Please request a new password reset.')
            }
            setIsValidToken(false)
        } else if (token) {
            // Valid token found
            setIsValidToken(true)
        } else {
            setError('Invalid or missing reset token')
            setIsValidToken(false)
        }
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long')
            return
        }

        setLoading(true)

        try {
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (authError) {
                setError(authError.message)
                setLoading(false)
                return
            }

            setSuccess(true)
            setNewPassword('')
            setConfirmPassword('')

            setTimeout(() => {
                router.push('/login')
            }, 2000)
        } catch (err) {
            console.error('Password reset error:', err)
            setError(err.message || 'Password reset failed')
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
                <p className="text-gray-600 mb-8">Enter your new password below</p>

                {/* Show error messages */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Show success message */}
                {success && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r mb-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm text-green-700">Password reset successfully! Redirecting to login...</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* If token is invalid/expired, show request new reset option */}
                {!isValidToken && error ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                            <p className="mb-2">Please request a new password reset link.</p>
                        </div>
                        <Link
                            href="/forgot-password"
                            className="w-full block text-center bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 transition"
                        >
                            Request Password Reset
                        </Link>
                        <Link
                            href="/login"
                            className="w-full block text-center text-indigo-600 hover:underline font-semibold py-2"
                        >
                            Back to Login
                        </Link>
                    </div>
                ) : isValidToken ? (
                    <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-gray-100"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-900"
                                    disabled={loading}
                                >
                                    {showPassword ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14zM10 15a5 5 0 015-5v2a3 3 0 01-3 3H8.5a3 3 0 01-2.12-.88l1.415-1.415A2.972 2.972 0 0110 13z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={loading}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent disabled:bg-gray-100"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !newPassword || !confirmPassword}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>
                    </form>
                ) : null}

                <p className="text-center text-gray-600 text-sm">
                    Remember your password?{' '}
                    <Link href="/login" className="text-indigo-600 hover:underline font-semibold">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    )
}
