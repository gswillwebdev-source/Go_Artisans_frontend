'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminDashboardPage() {
    const router = useRouter()
    const [stats, setStats] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')
    const [users, setUsers] = useState([])
    const [jobs, setJobs] = useState([])
    const [applications, setApplications] = useState([])
    const [completions, setCompletions] = useState([])
    const [emailStats, setEmailStats] = useState(null)
    const [emailRunning, setEmailRunning] = useState(false)
    const [emailRunResult, setEmailRunResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isChecking, setIsChecking] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sessionToken, setSessionToken] = useState(null)

    useEffect(() => {
        const checkAdminAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
                router.push('/admin/login')
                return
            }

            const { data: userProfile } = await supabase
                .from('users')
                .select('user_type')
                .eq('id', session.user.id)
                .single()

            if (userProfile?.user_type === 'admin') {
                setSessionToken(session.access_token)
                setIsChecking(false)
            } else {
                router.push('/admin/login')
            }
        }

        checkAdminAuth()
    }, [router])

    const fetchAllData = useCallback(async () => {
        if (!sessionToken) return
        try {
            setLoading(true)
            setError('')

            const res = await fetch('/api/admin/data', {
                headers: { Authorization: `Bearer ${sessionToken}` }
            })

            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || `HTTP ${res.status}`)
            }

            const data = await res.json()

            // Surface any per-table errors from the server
            if (data.errors) {
                const tableErrors = Object.entries(data.errors)
                    .filter(([, msg]) => msg)
                    .map(([table, msg]) => `${table}: ${msg}`)
                if (tableErrors.length > 0) {
                    setError('Some data failed to load — ' + tableErrors.join('; '))
                }
            }

            setUsers(data.users || [])
            setJobs(data.jobs || [])
            setApplications(data.applications || [])
            setCompletions(data.completions || [])

            const reviews = data.reviews || []
            setStats({
                totalUsers: data.counts.users,
                totalClients: data.users.filter(u => u.user_type === 'client').length,
                totalWorkers: data.users.filter(u => u.user_type === 'worker').length,
                totalJobs: data.counts.jobs,
                activeJobs: data.jobs.filter(j => j.status === 'active').length,
                completedJobs: data.jobs.filter(j => j.status === 'completed').length,
                totalApplications: data.counts.applications,
                pendingApplications: data.applications.filter(a => a.status === 'pending').length,
                acceptedApplications: data.applications.filter(a => a.status === 'accepted').length,
                totalCompletions: data.counts.completions,
                confirmedCompletions: data.completions.filter(c => c.status === 'confirmed').length,
                totalReviews: data.counts.reviews,
                averageRating: reviews.length > 0
                    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                    : 0
            })
        } catch (err) {
            setError(err.message || 'Failed to load data')
            console.error('Error fetching admin data:', err)
        } finally {
            setLoading(false)
        }
    }, [sessionToken])

    useEffect(() => {
        if (!isChecking && sessionToken) {
            fetchAllData()
        }
    }, [isChecking, sessionToken, fetchAllData])

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return

        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${sessionToken}` }
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to delete user')
            }
            setUsers(prev => prev.filter(u => u.id !== userId))
        } catch (err) {
            alert('Failed to delete user: ' + err.message)
        }
    }

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return

        try {
            const res = await fetch(`/api/admin/jobs/${jobId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${sessionToken}` }
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to delete job')
            }
            setJobs(prev => prev.filter(j => j.id !== jobId))
        } catch (err) {
            alert('Failed to delete job: ' + err.message)
        }
    }

    const fetchEmailStats = useCallback(async () => {
        if (!sessionToken) return
        try {
            const res = await fetch('/api/admin/email-campaigns', {
                headers: { Authorization: `Bearer ${sessionToken}` }
            })
            if (res.ok) {
                const data = await res.json()
                setEmailStats(data)
            }
        } catch (err) {
            console.error('Failed to load email stats:', err)
        }
    }, [sessionToken])

    const handleRunCampaigns = async () => {
        if (!window.confirm('Run all email campaigns now? This will send personalized emails to eligible users.')) return
        setEmailRunning(true)
        setEmailRunResult(null)
        try {
            const res = await fetch('/api/admin/email-campaigns', {
                method: 'POST',
                headers: { Authorization: `Bearer ${sessionToken}` }
            })
            const data = await res.json()
            setEmailRunResult(data)
            // Refresh stats
            await fetchEmailStats()
        } catch (err) {
            setEmailRunResult({ error: err.message })
        } finally {
            setEmailRunning(false)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/admin/login')
    }

    const handleTabChange = (tabId) => {
        setActiveTab(tabId)
        setSearchQuery('')
        if (tabId === 'emails') fetchEmailStats()
    }

    if (isChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full"></div>
            </div>
        )
    }

    const filteredUsers = users.filter(u =>
        u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredJobs = jobs.filter(j =>
        j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredApplications = applications.filter(a =>
        a.job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.worker?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.worker?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.worker?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredCompletions = completions.filter(c =>
        c.job?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.worker?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.worker?.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const tabs = [
        { id: 'overview', label: '📊 Overview' },
        { id: 'users', label: `👥 Users (${users.length})` },
        { id: 'jobs', label: `💼 Jobs (${jobs.length})` },
        { id: 'applications', label: `📋 Applications (${applications.length})` },
        { id: 'completions', label: `✅ Completions (${completions.length})` },
        { id: 'emails', label: '✉️ Emails' },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-indigo-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/admin/dashboard" className="text-2xl font-bold">
                            Go Artisans Admin
                        </Link>
                        <div className="flex gap-3 items-center">
                            <button
                                onClick={fetchAllData}
                                className="bg-indigo-500 hover:bg-indigo-700 px-4 py-2 rounded font-semibold transition text-sm"
                            >
                                ↻ Refresh
                            </button>
                            <button
                                onClick={handleLogout}
                                className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded font-semibold transition text-sm"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex gap-1 sm:gap-4 lg:gap-6 overflow-x-auto pb-px">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`px-3 sm:px-4 py-4 font-medium transition border-b-2 whitespace-nowrap text-xs sm:text-sm ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-6 sm:py-8">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center justify-between">
                        <span>{error}</span>
                        <button
                            onClick={fetchAllData}
                            className="ml-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div>
                        <p className="text-gray-600 mt-4">Loading admin data...</p>
                    </div>
                ) : (
                    <>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && stats && (
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard Overview</h1>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-blue-600">
                                        <p className="text-gray-500 text-sm font-medium">Total Users</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                                        <p className="text-xs text-gray-500 mt-2">Workers: {stats.totalWorkers} | Clients: {stats.totalClients}</p>
                                    </div>
                                    <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-green-600">
                                        <p className="text-gray-500 text-sm font-medium">Total Jobs</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalJobs}</p>
                                        <p className="text-xs text-gray-500 mt-2">Active: {stats.activeJobs} | Completed: {stats.completedJobs}</p>
                                    </div>
                                    <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-purple-600">
                                        <p className="text-gray-500 text-sm font-medium">Applications</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalApplications}</p>
                                        <p className="text-xs text-gray-500 mt-2">Pending: {stats.pendingApplications} | Accepted: {stats.acceptedApplications}</p>
                                    </div>
                                    <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-yellow-600">
                                        <p className="text-gray-500 text-sm font-medium">Completions</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCompletions}</p>
                                        <p className="text-xs text-gray-500 mt-2">Confirmed: {stats.confirmedCompletions}</p>
                                    </div>
                                    <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-orange-600">
                                        <p className="text-gray-500 text-sm font-medium">Average Rating</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">⭐ {stats.averageRating}/5</p>
                                        <p className="text-xs text-gray-500 mt-2">Total Reviews: {stats.totalReviews}</p>
                                    </div>
                                    <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-red-600">
                                        <p className="text-gray-500 text-sm font-medium">System Status</p>
                                        <p className="text-3xl font-bold text-green-600 mt-2">✓ Online</p>
                                        <p className="text-xs text-gray-500 mt-2">Last updated: {new Date().toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Users Tab */}
                        {activeTab === 'users' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Users Management</h2>
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full sm:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Name</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Email</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Type</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Phone</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Joined</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.length === 0 ? (
                                                <tr><td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">No users found</td></tr>
                                            ) : filteredUsers.map(user => (
                                                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-medium">{user.first_name} {user.last_name}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.user_type === 'worker' ? 'bg-blue-100 text-blue-800' :
                                                            user.user_type === 'client' ? 'bg-green-100 text-green-800' :
                                                                user.user_type === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                            {user.user_type || 'unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{user.phone_number || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {user.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        {user.user_type !== 'admin' && (
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="text-red-600 hover:text-red-900 font-medium text-xs"
                                                            >
                                                                Delete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Jobs Tab */}
                        {activeTab === 'jobs' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Jobs Management</h2>
                                    <input
                                        type="text"
                                        placeholder="Search by title or category..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full sm:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Title</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Client</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Category</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Budget</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Created</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredJobs.length === 0 ? (
                                                <tr><td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">No jobs found</td></tr>
                                            ) : filteredJobs.map(job => (
                                                <tr key={job.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-medium max-w-xs truncate">{job.title}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                                                        {job.client ? `${job.client.first_name} ${job.client.last_name}` : '—'}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{job.category || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{job.budget || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${job.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                            job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                'bg-gray-100 text-gray-800'}`}>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{new Date(job.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        <button
                                                            onClick={() => handleDeleteJob(job.id)}
                                                            className="text-red-600 hover:text-red-900 font-medium text-xs"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Applications Tab */}
                        {activeTab === 'applications' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Applications Management</h2>
                                    <input
                                        type="text"
                                        placeholder="Search by job or worker..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full sm:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Job Title</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Worker</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Worker Email</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Proposed Price</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Applied</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredApplications.length === 0 ? (
                                                <tr><td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">No applications found</td></tr>
                                            ) : filteredApplications.map(app => (
                                                <tr key={app.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-medium">{app.job?.title || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                                                        {app.worker ? `${app.worker.first_name} ${app.worker.last_name}` : '—'}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{app.worker?.email || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                                app.status === 'declined' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'}`}>
                                                            {app.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{app.proposed_price || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{new Date(app.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Completions Tab */}
                        {activeTab === 'completions' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Job Completions</h2>
                                    <input
                                        type="text"
                                        placeholder="Search by job or worker..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full sm:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Job Title</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Worker</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Client</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Final Price</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Completed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCompletions.length === 0 ? (
                                                <tr><td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500">No completions found</td></tr>
                                            ) : filteredCompletions.map(c => (
                                                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 font-medium">{c.job?.title || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                                                        {c.worker ? `${c.worker.first_name} ${c.worker.last_name}` : '—'}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                                                        {c.client ? `${c.client.first_name} ${c.client.last_name}` : '—'}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${c.status === 'completed' ? 'bg-yellow-100 text-yellow-800' :
                                                            c.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                                'bg-red-100 text-red-800'}`}>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{c.final_price || '—'}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{new Date(c.created_at).toLocaleDateString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Emails Tab */}
                        {activeTab === 'emails' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                                    <div>
                                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Email Campaigns</h2>
                                        <p className="text-sm text-gray-500 mt-1">Personalized emails sent automatically every day at 9 AM. You can also trigger them manually.</p>
                                    </div>
                                    <button
                                        onClick={handleRunCampaigns}
                                        disabled={emailRunning}
                                        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white px-5 py-2.5 rounded-lg font-semibold transition text-sm"
                                    >
                                        {emailRunning ? '⏳ Sending…' : '▶ Run Campaigns Now'}
                                    </button>
                                </div>

                                {/* Run result */}
                                {emailRunResult && (
                                    <div className={`p-4 rounded-lg border mb-6 ${emailRunResult.error ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>
                                        {emailRunResult.error ? (
                                            <p className="font-medium">Error: {emailRunResult.error}</p>
                                        ) : (
                                            <div>
                                                <p className="font-semibold mb-1">Campaign completed!</p>
                                                <p className="text-sm">✅ {emailRunResult.sent} sent &nbsp;·&nbsp; ⚠️ {emailRunResult.failed} failed &nbsp;·&nbsp; ⏭ {emailRunResult.skipped} skipped (already sent)</p>
                                                {emailRunResult.details?.filter(d => d.status === 'failed').map((d, i) => (
                                                    <p key={i} className="text-xs mt-1 text-red-600">Failed: {d.to} — {d.error}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Campaign types explained */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                                    {[
                                        { icon: '👋', label: 'Welcome', desc: 'Sent to new users within 48 h of registration', color: 'blue' },
                                        { icon: '📝', label: 'Profile Reminder', desc: 'Sent to users with incomplete profiles (3+ days old)', color: 'yellow' },
                                        { icon: '💼', label: 'No Applications', desc: 'Sent to workers who haven\'t applied to any job yet', color: 'purple' },
                                        { icon: '🎉', label: 'Application Accepted', desc: 'Sent to workers when their proposal is accepted', color: 'green' },
                                        { icon: '⭐', label: 'Review Request', desc: 'Sent to both parties after a job is confirmed complete', color: 'orange' },
                                        { icon: '🔁', label: 'Re-engagement', desc: 'Sent to inactive users who haven\'t been active for 7+ days', color: 'red' },
                                    ].map(({ icon, label, desc, color }) => (
                                        <div key={label} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xl">{icon}</span>
                                                <span className="font-semibold text-gray-800 text-sm">{label}</span>
                                                {emailStats?.breakdown?.find(b => b.label === label || b.label.startsWith(label.split(' ')[0])) && (
                                                    <span className="ml-auto bg-indigo-100 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded-full">
                                                        {emailStats.breakdown.find(b => b.label === label || b.label.startsWith(label.split(' ')[0]))?.count} this week
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Stats summary */}
                                {emailStats && (
                                    <div className="mb-6">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-800">Last 7 days — {emailStats.total} emails sent</h3>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {emailStats.breakdown.map(b => (
                                                <div key={b.type} className="bg-white border border-gray-200 rounded-lg p-3 text-center shadow-sm">
                                                    <p className="text-2xl font-bold text-indigo-600">{b.count}</p>
                                                    <p className="text-xs text-gray-500 mt-1">{b.label}</p>
                                                </div>
                                            ))}
                                            {emailStats.breakdown.length === 0 && (
                                                <p className="col-span-4 text-sm text-gray-500 text-center py-4">No emails sent in the last 7 days.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Recent log */}
                                {emailStats?.recentLogs?.length > 0 && (
                                    <div>
                                        <h3 className="font-semibold text-gray-800 mb-3">Recent sends</h3>
                                        <div className="bg-white shadow-sm rounded-lg overflow-x-auto border border-gray-200">
                                            <table className="w-full min-w-max">
                                                <thead className="bg-gray-50 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Type</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">User ID</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Sent At</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {emailStats.recentLogs.map(log => (
                                                        <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm">
                                                                <span className="bg-indigo-50 text-indigo-700 text-xs font-medium px-2 py-0.5 rounded">
                                                                    {log.email_type.replace(/_/g, ' ')}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-gray-500 font-mono">{log.user_id?.substring(0, 12)}…</td>
                                                            <td className="px-4 py-3 text-xs text-gray-500">{new Date(log.sent_at).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {!emailStats && (
                                    <div className="text-center py-12 text-gray-400">
                                        <p className="text-sm">Click the tab to load email stats, or run a campaign to see results here.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
