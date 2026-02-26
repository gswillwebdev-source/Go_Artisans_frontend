'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import adminClient from '@/lib/adminClient'

export default function AdminDashboardPage() {
    const router = useRouter()
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isChecking, setIsChecking] = useState(true)

    useEffect(() => {
        // Check if admin is logged in
        const token = typeof window !== 'undefined' ? localStorage.getItem('adminToken') : null
        if (!token) {
            router.push('/admin/login')
            return
        }
        setIsChecking(false)
    }, [router])

    useEffect(() => {
        if (!isChecking) {
            fetchStats()
        }
    }, [isChecking])

    const fetchStats = async () => {
        try {
            setLoading(true)
            setError('')
            const data = await adminClient.getDashboardStats()
            setStats(data)
        } catch (err) {
            setError(err.message || 'Failed to load statistics')
            console.error('Error fetching stats:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        adminClient.logout()
        router.push('/admin/login')
    }

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-red-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/admin/dashboard" className="text-2xl font-bold">
                            GoArtisans Admin
                        </Link>
                        <div className="flex gap-4 items-center">
                            <Link href="/admin/users" className="hover:bg-red-700 px-3 py-2 rounded">
                                Users
                            </Link>
                            <Link href="/admin/reviews" className="hover:bg-red-700 px-3 py-2 rounded">
                                Reviews
                            </Link>
                            <Link href="/admin/settings" className="hover:bg-red-700 px-3 py-2 rounded">
                                Settings
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="bg-red-700 hover:bg-red-800 px-3 py-2 rounded font-semibold"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Dashboard</h1>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                        {error}
                        <button
                            onClick={fetchStats}
                            className="ml-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block">
                            <div className="animate-spin h-12 w-12 border-b-2 border-red-600 rounded-full"></div>
                        </div>
                        <p className="text-gray-600 mt-4">Loading statistics...</p>
                    </div>
                ) : stats ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Workers Card */}
                        <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-blue-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Total Workers</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalWorkers}</p>
                                </div>
                                <div className="bg-blue-100 rounded-full p-3">
                                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m6 0H9m6 0a4 4 0 11-8 0" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Total Clients Card */}
                        <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-green-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Total Clients</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalClients}</p>
                                </div>
                                <div className="bg-green-100 rounded-full p-3">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m0 0h5.581M9 21h0m0 0H5m0 0h0" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Total Jobs Card */}
                        <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-purple-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Total Jobs</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalJobs}</p>
                                </div>
                                <div className="bg-purple-100 rounded-full p-3">
                                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.728 0-7.333-.57-10.759-1.664m0 0a.5.5 0 00-.656.707A23.97 23.97 0 0012 21c3.728 0 7.333-.57 10.759-1.664m0 0a.5.5 0 00.656-.707M5.072 12.256h13.856" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Pending Verifications Card */}
                        <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-orange-600">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Pending Verifications</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.pendingVerifications}</p>
                                </div>
                                <div className="bg-orange-100 rounded-full p-3">
                                    <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {/* Quick Actions */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Link
                            href="/admin/users"
                            className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition text-center"
                        >
                            <svg className="w-12 h-12 text-blue-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20a6 6 0 1112 0v-2H6v2z" />
                            </svg>
                            <h3 className="font-bold text-gray-900">Manage Users</h3>
                            <p className="text-sm text-gray-600 mt-2">View, edit, and manage user accounts</p>
                        </Link>

                        <Link
                            href="/admin/reviews"
                            className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition text-center"
                        >
                            <svg className="w-12 h-12 text-yellow-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <h3 className="font-bold text-gray-900">Manage Reviews</h3>
                            <p className="text-sm text-gray-600 mt-2">Edit and delete user reviews</p>
                        </Link>

                        <button
                            onClick={() => router.push('/admin/users?action=add')}
                            className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition text-center hover:bg-gray-50"
                        >
                            <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                            <h3 className="font-bold text-gray-900">Add New User</h3>
                            <p className="text-sm text-gray-600 mt-2">Create a new user account</p>
                        </button>

                        <button
                            onClick={fetchStats}
                            className="bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition text-center hover:bg-gray-50"
                        >
                            <svg className="w-12 h-12 text-orange-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <h3 className="font-bold text-gray-900">Refresh Stats</h3>
                            <p className="text-sm text-gray-600 mt-2">Update dashboard statistics</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
