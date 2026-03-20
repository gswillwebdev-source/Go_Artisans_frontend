'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminLoginPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({ email: '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // Check if already logged in as admin
        const checkAdminAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                // Check if user is admin
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('id, user_type, email, first_name, last_name')
                    .eq('id', session.user.id)
                    .single()

                // Allow access if user_type is 'admin'
                if (userProfile?.user_type === 'admin') {
                    localStorage.setItem('adminUser', JSON.stringify(userProfile))
                    router.push('/admin/dashboard')
                } else {
                    await supabase.auth.signOut()
                    setIsChecking(false)
                }
            } else {
                setIsChecking(false)
            }
        }

        checkAdminAuth()
    }, [router])

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const mapAuthError = (authError) => {
        if (!authError) return 'Login failed. Please try again.'

        const status = Number(authError.status || authError.code || 0)
        const message = (authError.message || '').toLowerCase()

        if (status >= 500) {
            return 'Supabase auth is temporarily unavailable (server error). Please retry in a few seconds.'
        }
        if (message.includes('invalid login credentials')) {
            return 'Invalid email or password.'
        }
        if (message.includes('email not confirmed')) {
            return 'Please confirm your email before logging in.'
        }

        return authError.message || 'Login failed. Please try again.'
    }

    const signInWithRetry = async (email, password) => {
        let lastError = null

        for (let attempt = 1; attempt <= 2; attempt++) {
            const result = await supabase.auth.signInWithPassword({ email, password })
            if (!result.error) return result

            lastError = result.error
            const status = Number(result.error.status || result.error.code || 0)

            // Retry once for transient auth server failures.
            if (status >= 500 && attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 700))
                continue
            }

            return result
        }

        return { data: null, error: lastError }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const email = formData.email.trim().toLowerCase()
            const password = formData.password

            // First, sign in with email and password
            const { data: authData, error: authError } = await signInWithRetry(email, password)

            if (authError) {
                setError(mapAuthError(authError))
                setLoading(false)
                return
            }

            if (authData.user) {
                // Check if user is admin
                const { data: userProfile, error: profileError } = await supabase
                    .from('users')
                    .select('id, user_type, email, first_name, last_name')
                    .eq('id', authData.user.id)
                    .single()

                if (profileError) {
                    setError('Login succeeded, but failed to load admin profile. Please try again.')
                    await supabase.auth.signOut()
                    setLoading(false)
                    return
                }

                // Allow login if user_type is 'admin'
                if (userProfile?.user_type === 'admin') {
                    localStorage.setItem('adminUser', JSON.stringify(userProfile))
                    router.push('/admin/dashboard')
                } else {
                    setError(`Access denied. Your account type is '${userProfile?.user_type || 'unknown'}'. Admin privileges required.`)
                    await supabase.auth.signOut()
                }
            }
        } catch (err) {
            console.error('Admin login error:', err)
            setError(err.message || 'An unexpected error occurred')
        }
        setLoading(false)
    }

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">GoArtisans Admin</h1>
                    <p className="text-gray-600">Admin Panel Login</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r mb-6">
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

                <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                            placeholder="jobs70341@gmail.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="text-center">
                    <p className="text-gray-600 text-sm">
                        Back to{' '}
                        <Link href="/" className="text-red-600 hover:underline font-semibold">
                            GoArtisans
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
