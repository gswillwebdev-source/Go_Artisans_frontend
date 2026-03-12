'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export default function ChooseRolePage() {
    const router = useRouter()
    const { user, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            // useAuth will redirect to login
            return
        }

        // If user already has a role, redirect
        if (user.user_type === 'worker') {
            router.push('/worker-profile')
            return
        } else if (user.user_type === 'client') {
            router.push('/client-profile')
            return
        }
    }, [user, authLoading, router])

    const handleWorkerChoice = async () => {
        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    phone_number: user.phone_number || null,
                    user_type: 'worker'
                }, { onConflict: 'id' })

            if (error) throw error

            router.replace('/worker-profile')
        } catch (err) {
            console.error('Failed to set role:', err)
            setError('Failed to set role. Please try again.')
            setLoading(false)
        }
    }

    const handleClientChoice = async () => {
        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase
                .from('users')
                .upsert({
                    id: user.id,
                    email: user.email,
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    phone_number: user.phone_number || null,
                    user_type: 'client'
                }, { onConflict: 'id' })

            if (error) throw error

            router.replace('/client-profile')
        } catch (err) {
            console.error('Failed to set role:', err)
            setError('Failed to set role. Please try again.')
            setLoading(false)
        }
    }

    if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-2 text-center">Welcome to GoArtisans</h1>
                <p className="text-gray-600 text-center mb-4">Hi {user.first_name}! 👋</p>
                <p className="text-gray-600 text-center mb-8">What are you looking to do?</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Worker Card */}
                    <button
                        onClick={handleWorkerChoice}
                        disabled={loading}
                        className="border-2 border-indigo-600 rounded-lg p-8 hover:bg-indigo-50 transition transform hover:scale-105 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="text-4xl mb-4">🔧</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm a Service Provider</h2>
                        <p className="text-gray-600 mb-4">I want to offer my professional services and build my portfolio.</p>
                        <div className="text-sm text-indigo-600 font-semibold flex items-center gap-2">
                            {loading ? 'Setting up...' : 'Set up as Worker'} <span>→</span>
                        </div>
                    </button>

                    {/* Client Card */}
                    <button
                        onClick={handleClientChoice}
                        disabled={loading}
                        className="border-2 border-green-600 rounded-lg p-8 hover:bg-green-50 transition transform hover:scale-105 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="text-4xl mb-4">👥</div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">I'm Looking for Help</h2>
                        <p className="text-gray-600 mb-4">I want to find and hire service providers for my projects.</p>
                        <div className="text-sm text-green-600 font-semibold flex items-center gap-2">
                            {loading ? 'Setting up...' : 'Set up as Client'} <span>→</span>
                        </div>
                    </button>
                </div>

                <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                    <p className="text-gray-600 text-sm">
                        Not sure which one? You can always change this later in your profile settings.
                    </p>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push('/jobs')}
                        className="text-indigo-600 hover:underline text-sm"
                    >
                        Skip for now and browse jobs
                    </button>
                </div>
            </div>
        </div>
    )
}
