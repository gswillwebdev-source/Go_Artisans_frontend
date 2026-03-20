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
    // null = still checking | true = valid recovery session | false = invalid/expired
    const [tokenStatus, setTokenStatus] = useState(null)

    useEffect(() => {
        // Check for error params Supabase appends to the hash when the link is
        // expired or invalid (e.g. #error=access_denied&error_code=otp_expired)
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        const params = new URLSearchParams(hash.substring(1))
        const errorCode = params.get('error_code')

        if (errorCode) {
            setError(
                errorCode === 'otp_expired'
                    ? 'Your reset link has expired (30-minute limit). Please request a new one.'
                    : (params.get('error_description') || 'Invalid reset link. Please request a new one.')
                        .replace(/\+/g, ' ')
            )
            setTokenStatus(false)
            return
        }

        // Listen for Supabase PASSWORD_RECOVERY event.
        // With detectSessionInUrl: true, Supabase parses the URL hash automatically
        // and fires this event when the recovery token is valid.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setTokenStatus(true)
            }
        })

        // Also check if a recovery session is already active (handles page reload)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setTokenStatus(true)
            } else if (tokenStatus === null) {
                // No session and no error — wait briefly then show invalid
                setTimeout(() => {
                    setTokenStatus((prev) => {
                        if (prev === null) {
                            setError('Invalid or missing reset link. Please request a new one.')
                            return false
                        }
                        return prev
                    })
                }, 2000)
            }
        })

        return () => subscription.unsubscribe()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

        // Update password via Supabase Auth.
        // The Postgres trigger on auth.users will automatically set
        // last_password_reset_at = NOW() server-side — no client action needed.
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
        })

        if (updateError) {
            setError(updateError.message)
            setLoading(false)
            return
        }

        // Sign out so the recovery session is cleared
        await supabase.auth.signOut()

        setSuccess(true)
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => router.push('/login'), 2500)
    }

    // ── Loading state while we wait for the auth event ──────────────────────
    if (tokenStatus === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
                    <p className="text-gray-600">Verifying your reset link...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
                <p className="text-gray-600 mb-8">Enter your new password below</p>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-4">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="ml-3 text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r mb-4">
                        <div className="flex items-start">
                            <svg className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <p className="ml-3 text-sm text-green-700">Password reset successfully! Redirecting to login...</p>
                        </div>
                    </div>
                )}

                {/* Invalid / expired token */}
                {!tokenStatus && !success ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700">
                            <p>Please request a new password reset link.</p>
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
                ) : tokenStatus && !success ? (
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
                                    placeholder="........"
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
                                placeholder="........"
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
