'use client'

import { useState } from 'react'
import Link from 'next/link'
import axios from 'axios'

export default function ForgotPasswordPage() {
    const [step, setStep] = useState(1) // 1: email, 2: verification code, 3: new password
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Step 1: Request verification code
    const handleRequestCode = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`,
                { email }
            )
            setSuccess('Verification code sent to your email')
            setStep(2)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send verification code')
        }
        setLoading(false)
    }

    // Step 2: Verify code
    const handleVerifyCode = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-code`,
                { email, code }
            )
            setSuccess('Code verified! Enter your new password')
            setStep(3)
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid verification code')
        }
        setLoading(false)
    }

    // Step 3: Reset password
    const handleResetPassword = async (e) => {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        setLoading(true)
        setError('')
        setSuccess('')
        try {
            await axios.post(
                `${process.env.NEXT_PUBLIC_API_URL}/api/auth/reset-password`,
                { email, code, newPassword }
            )
            setSuccess('Password reset successfully! Redirecting to login...')
            setTimeout(() => {
                window.location.href = '/login'
            }, 2000)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password')
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
                <p className="text-gray-600 mb-8">
                    {step === 1 && 'Enter your email to receive a verification code'}
                    {step === 2 && 'Enter the verification code from your email'}
                    {step === 3 && 'Enter your new password'}
                </p>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
                {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

                {/* Step 1: Email */}
                {step === 1 && (
                    <form onSubmit={handleRequestCode} className="space-y-4">
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
                            {loading ? 'Sending...' : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {/* Step 2: Verification Code */}
                {step === 2 && (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                maxLength="6"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-center text-2xl tracking-widest"
                                placeholder="000000"
                            />
                            <p className="text-xs text-gray-500 mt-2">Check your email for the 6-digit code</p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-indigo-600 hover:underline text-sm"
                        >
                            Back to email
                        </button>
                    </form>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                <p className="text-center text-gray-600 mt-6">
                    <Link href="/login" className="text-indigo-600 hover:underline font-semibold">
                        Back to login
                    </Link>
                </p>
            </div>
        </div>
    )
}