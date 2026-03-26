'use client'

import { useState, useEffect } from 'react'
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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isChecking, setIsChecking] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        // Check if admin is logged in
        const checkAdminAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('user_type, email')
                    .eq('email', session.user.email)
                    .single()

                if (userProfile?.email === 'admin@example.com' || userProfile?.user_type === 'admin') {
                    setIsChecking(false)
                } else {
                    router.push('/admin/login')
                }
            } else {
                router.push('/admin/login')
            }
        }

        checkAdminAuth()
    }, [router])

    useEffect(() => {
        if (!isChecking) {
            fetchAllData()
        }
    }, [isChecking])

    const fetchAllData = async () => {
        try {
            setLoading(true)
            setError('')

            const [usersResult, jobsResult, applicationsResult, reviewsResult, completionsResult] = await Promise.all([
                supabase.from('users').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
                supabase.from('jobs').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
                supabase.from('applications').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
                supabase.from('reviews').select('*', { count: 'exact' }),
                supabase.from('completions').select('*', { count: 'exact' }).order('created_at', { ascending: false })
            ])

            setUsers(usersResult.data || [])
            setJobs(jobsResult.data || [])
            setApplications(applicationsResult.data || [])
            setCompletions(completionsResult.data || [])

            const stats = {
                totalUsers: usersResult.count || 0,
                totalClients: usersResult.data?.filter(u => u.user_type === 'client').length || 0,
                totalWorkers: usersResult.data?.filter(u => u.user_type === 'worker').length || 0,
                totalJobs: jobsResult.count || 0,
                activeJobs: jobsResult.data?.filter(j => j.status === 'active').length || 0,
                completedJobs: jobsResult.data?.filter(j => j.status === 'completed').length || 0,
                totalApplications: applicationsResult.count || 0,
                pendingApplications: applicationsResult.data?.filter(a => a.status === 'pending').length || 0,
                acceptedApplications: applicationsResult.data?.filter(a => a.status === 'accepted').length || 0,
                totalCompletions: completionsResult.count || 0,
                confirmedCompletions: completionsResult.data?.filter(c => c.status === 'confirmed').length || 0,
                totalReviews: reviewsResult.count || 0,
                averageRating: reviewsResult.data?.length > 0
                    ? (reviewsResult.data.reduce((sum, r) => sum + r.rating, 0) / reviewsResult.data.length).toFixed(1)
                    : 0
            }

            setStats(stats)
        } catch (err) {
            setError('Failed to load data')
            console.error('Error fetching data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return

        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId)

            if (error) throw error
            setUsers(users.filter(u => u.id !== userId))
        } catch (err) {
            alert('Failed to delete user: ' + err.message)
        }
    }

    const handleDeleteJob = async (jobId) => {
        if (!window.confirm('Are you sure you want to delete this job?')) return

        try {
            const { error } = await supabase
                .from('jobs')
                .delete()
                .eq('id', jobId)

            if (error) throw error
            setJobs(jobs.filter(j => j.id !== jobId))
        } catch (err) {
            alert('Failed to delete job: ' + err.message)
        }
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/admin/login')
    }

    if (isChecking) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>
    }

    const filteredUsers = users.filter(u =>
        u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredJobs = jobs.filter(j =>
        j.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Navbar */}
            <nav className="bg-indigo-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <Link href="/admin/dashboard" className="text-2xl font-bold">
                            JobSeek Admin
                        </Link>
                        <div className="flex gap-2 items-center">
                            <button
                                onClick={handleLogout}
                                className="bg-indigo-700 hover:bg-indigo-800 px-4 py-2 rounded font-semibold transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 lg:px-8">
                    <div className="flex gap-4 sm:gap-6 lg:gap-8 overflow-x-auto pb-px">
                        {[
                            { id: 'overview', label: '📊 Overview' },
                            { id: 'users', label: '👥 Users' },
                            { id: 'jobs', label: '💼 Jobs' },
                            { id: 'applications', label: '📋 Applications' },
                            { id: 'completions', label: '✅ Completions' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-4 font-medium transition border-b-2 whitespace-nowrap ${activeTab === tab.id
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
            <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 lg:px-8 py-6 sm:py-8">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                        {error}
                        <button
                            onClick={fetchAllData}
                            className="ml-4 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block">
                            <div className="animate-spin h-12 w-12 border-b-2 border-indigo-600 rounded-full"></div>
                        </div>
                        <p className="text-gray-600 mt-4">Loading data...</p>
                    </div>
                ) : (
                    <>
                        {/* Overview Tab */}
                        {activeTab === 'overview' && stats && (
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard Overview</h1>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                    {/* Stats Cards */}
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
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Users Management</h2>
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>

                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Name</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Email</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Type</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Phone</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-4 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">No users found</td>
                                                </tr>
                                            ) : (
                                                filteredUsers.map(user => (
                                                    <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900">{user.first_name} {user.last_name}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{user.email}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.user_type === 'worker' ? 'bg-blue-100 text-blue-800' :
                                                                    user.user_type === 'client' ? 'bg-green-100 text-green-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {user.user_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{user.phone_number || '—'}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                {user.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                                                            <button
                                                                onClick={() => handleDeleteUser(user.id)}
                                                                className="text-red-600 hover:text-red-900 font-medium whitespace-nowrap"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Jobs Tab */}
                        {activeTab === 'jobs' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Jobs Management</h2>
                                    <input
                                        type="text"
                                        placeholder="Search jobs..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                    />
                                </div>

                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Title</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Category</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Budget</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Created</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredJobs.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-4 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">No jobs found</td>
                                                </tr>
                                            ) : (
                                                filteredJobs.map(job => (
                                                    <tr key={job.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{job.title}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{job.category}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{job.budget}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${job.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {job.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{new Date(job.created_at).toLocaleDateString()}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                                                            <button
                                                                onClick={() => handleDeleteJob(job.id)}
                                                                className="text-red-600 hover:text-red-900 font-medium whitespace-nowrap"
                                                            >
                                                                Delete
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Applications Tab */}
                        {activeTab === 'applications' && (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Applications Management</h2>

                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Job ID</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Worker ID</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Price</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Applied</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-4 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">No applications</td>
                                                </tr>
                                            ) : (
                                                applications.map(app => (
                                                    <tr key={app.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{app.job_id.substring(0, 8)}...</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{app.worker_id.substring(0, 8)}...</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                                    app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                                        'bg-red-100 text-red-800'
                                                                }`}>
                                                                {app.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{app.proposed_price}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{new Date(app.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Completions Tab */}
                        {activeTab === 'completions' && (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Job Completions Management</h2>

                                <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                    <table className="w-full min-w-max">
                                        <thead className="bg-gray-100 border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Job ID</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Worker</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Status</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Final Price</th>
                                                <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-900">Completed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {completions.length === 0 ? (
                                                <tr>
                                                    <td colSpan="5" className="px-4 sm:px-6 py-4 text-center text-xs sm:text-sm text-gray-500">No completions</td>
                                                </tr>
                                            ) : (
                                                completions.map(completion => (
                                                    <tr key={completion.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{completion.job_id.substring(0, 8)}...</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{completion.worker_id.substring(0, 8)}...</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${completion.status === 'completed' ? 'bg-yellow-100 text-yellow-800' :
                                                                    completion.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                                        'bg-red-100 text-red-800'
                                                                }`}>
                                                                {completion.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{completion.final_price}</td>
                                                        <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">{new Date(completion.created_at).toLocaleDateString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
