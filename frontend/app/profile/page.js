'use client'

import { useEffect, useState } from 'react'
import apiClient from '@/lib/apiClient'

export default function ProfilePage() {
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        if (!token) {
            window.location.href = '/login'
            return
        }

        apiClient.setToken(token)

        async function fetchProfile() {
            try {
                setLoading(true)
                const res = await apiClient.getUserProfile()
                setProfile(res.data.user || res.data)
            } catch (err) {
                console.error('Failed to fetch profile', err)
                setError('Failed to load profile')
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [])

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading profile...</div>
    if (error) return <div className="min-h-screen flex items-center justify-center">{error}</div>

    return (
        <div className="min-h-screen bg-gray-50 py-12">
            <div className="max-w-3xl mx-auto bg-white shadow rounded-lg p-8">
                <h2 className="text-2xl font-bold mb-4">Your Profile</h2>
                {profile ? (
                    <div className="space-y-3">
                        <div><span className="font-semibold">First name:</span> {profile.firstName}</div>
                        <div><span className="font-semibold">Last name:</span> {profile.lastName}</div>
                        <div><span className="font-semibold">Email:</span> {profile.email}</div>
                        {profile.createdAt && (
                            <div><span className="font-semibold">Member since:</span> {new Date(profile.createdAt).toLocaleString()}</div>
                        )}
                    </div>
                ) : (
                    <div>No profile data available.</div>
                )}
            </div>
        </div>
    )
}
