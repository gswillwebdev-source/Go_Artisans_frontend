'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AcceptInvitePage() {
    const { token } = useParams()
    const router = useRouter()
    const [invite, setInvite] = useState(null)
    const [pageError, setPageError] = useState('')
    const [loading, setLoading] = useState(true)
    const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (!token) { setPageError('Missing invitation token'); setLoading(false); return }
        fetch(`/api/admin/invite/accept?token=${token}`)
            .then(r => r.json())
            .then(data => {
                if (data.valid) {
                    setInvite(data)
                    if (data.name) setForm(f => ({ ...f, name: data.name }))
                } else {
                    setPageError(data.error || 'Invalid invitation')
                }
            })
            .catch(() => setPageError('Failed to validate invitation. Please try again.'))
            .finally(() => setLoading(false))
    }, [token])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setFormError('')
        if (form.password !== form.confirmPassword) { setFormError('Passwords do not match'); return }
        if (form.password.length < 8) { setFormError('Password must be at least 8 characters'); return }

        setSaving(true)
        try {
            const res = await fetch('/api/admin/invite/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, name: form.name.trim(), password: form.password }),
            })
            const data = await res.json()
            if (!res.ok) { setFormError(data.error || 'Failed to create account'); return }
            setSuccess(true)
        } catch { setFormError('Something went wrong. Please try again.') }
        finally { setSaving(false) }
    }

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full" />
        </div>
    )

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-2xl mb-4 shadow-lg">
                        <span className="text-white text-2xl font-bold">G</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">GoArtisans Admin</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                    {/* Success state */}
                    {success && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Created!</h2>
                            <p className="text-gray-500 mb-6">Your staff account is ready. You can now sign in to the admin panel.</p>
                            <Link href="/admin/login"
                                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition">
                                Go to Login
                            </Link>
                        </div>
                    )}

                    {/* Invalid token state */}
                    {!success && pageError && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a7 7 0 100 14A7 7 0 0012 5z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invitation Issue</h2>
                            <p className="text-gray-500">{pageError}</p>
                        </div>
                    )}

                    {/* Form */}
                    {!success && !pageError && invite && (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-1">Accept Invitation</h2>
                                <p className="text-sm text-gray-500">
                                    You've been invited as a{' '}
                                    <span className="font-semibold text-gray-700">
                                        {invite.role === 'manager' ? 'Manager' : 'Assistant'}
                                    </span>
                                </p>
                                <p className="text-sm text-gray-400 mt-1">{invite.email}</p>
                            </div>

                            {formError && (
                                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Full Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Jane Doe"
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Create Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={form.password}
                                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                            placeholder="Min. 8 characters"
                                            required
                                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                        />
                                        <button type="button" onClick={() => setShowPassword(s => !s)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.confirmPassword}
                                        onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                        placeholder="Repeat password"
                                        required
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-60 transition mt-2"
                                >
                                    {saving ? 'Creating Account…' : 'Create Account & Accept'}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
