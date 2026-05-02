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
    const [verifications, setVerifications] = useState([])
    const [emailStats, setEmailStats] = useState(null)
    const [emailRunning, setEmailRunning] = useState(false)
    const [emailRunResult, setEmailRunResult] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isChecking, setIsChecking] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [sessionToken, setSessionToken] = useState(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [staffPermissions, setStaffPermissions] = useState(null) // null = full admin access

    // Edit / suspend user modal state
    const [editUserModal, setEditUserModal] = useState(null)   // { id, first_name, last_name, email }
    const [editUserData, setEditUserData] = useState({})
    const [editUserSaving, setEditUserSaving] = useState(false)
    const [suspendModal, setSuspendModal] = useState(null)     // { id, first_name, last_name }
    const [suspendReason, setSuspendReason] = useState('')
    const [suspendSaving, setSuspendSaving] = useState(false)

    // Reject badge modal state
    const [rejectModal, setRejectModal] = useState(null)       // { id, user }
    const [rejectReason, setRejectReason] = useState('')
    const [rejectSaving, setRejectSaving] = useState(false)

    // Subscriptions / WhatsApp pending requests
    const [whatsappRequests, setWhatsappRequests] = useState([])
    const [subLoading, setSubLoading] = useState(false)
    const [activatingId, setActivatingId] = useState(null)

    // All subscriptions
    const [allSubscriptions, setAllSubscriptions] = useState([])
    const [allSubsLoading, setAllSubsLoading] = useState(false)
    const [deactivatingId, setDeactivatingId] = useState(null)

    // Grant badge modal
    const [grantBadgeUserId, setGrantBadgeUserId] = useState('')
    const [grantBadgeLoading, setGrantBadgeLoading] = useState(false)

    // Inline job status edit
    const [jobStatusEdits, setJobStatusEdits] = useState({})   // { jobId: newStatus }

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
                setIsAdmin(true)
                setStaffPermissions(null)
                setSessionToken(session.access_token)
                setIsChecking(false)
            } else if (userProfile?.user_type === 'staff') {
                // Load permissions from localStorage (set at login time)
                const stored = typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null
                const storedUser = stored ? JSON.parse(stored) : null
                setIsAdmin(false)
                setStaffPermissions(storedUser?.staffPermissions || {})
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
            setVerifications(data.verifications || [])

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
                    : 0,
                totalVerifications: data.counts.verifications || 0,
                pendingVerifications: data.counts.pendingVerifications || 0,
                approvedVerifications: (data.verifications || []).filter(v => v.status === 'approved').length,
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

    const fetchWhatsappRequests = useCallback(async () => {
        if (!sessionToken) return
        setSubLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/admin/whatsapp-requests`, {
                headers: { Authorization: `Bearer ${sessionToken}` }
            })
            const data = await res.json()
            setWhatsappRequests(data.requests || [])
        } catch (err) {
            console.error('fetchWhatsappRequests error:', err)
        } finally {
            setSubLoading(false)
        }
    }, [sessionToken])

    const handleActivateSubscription = async (req, bc) => {
        if (!window.confirm(`Activate ${req.plan_id} (${bc}) for ${req.user?.email}?`)) return
        setActivatingId(req.user?.id)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/admin/activate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${sessionToken}`
                },
                body: JSON.stringify({ user_id: req.user?.id, plan_id: req.plan_id, billing_cycle: bc })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            alert(data.message)
            fetchWhatsappRequests()
        } catch (err) {
            alert('Failed to activate: ' + err.message)
        } finally {
            setActivatingId(null)
        }
    }

    useEffect(() => {
        if (activeTab === 'subscriptions' && sessionToken) {
            fetchWhatsappRequests()
            fetchAllSubscriptions()
        }
    }, [activeTab, sessionToken, fetchWhatsappRequests])

    const fetchAllSubscriptions = useCallback(async () => {
        if (!sessionToken) return
        setAllSubsLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/admin/all-subscriptions`, {
                headers: { Authorization: `Bearer ${sessionToken}` }
            })
            const data = await res.json()
            setAllSubscriptions(data.subscriptions || [])
        } catch (err) {
            console.error('fetchAllSubscriptions error:', err)
        } finally {
            setAllSubsLoading(false)
        }
    }, [sessionToken])

    const handleDeactivateSubscription = async (userId, userEmail) => {
        if (!window.confirm(`Deactivate subscription for ${userEmail}?`)) return
        setDeactivatingId(userId)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/admin/deactivate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
                body: JSON.stringify({ user_id: userId })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            alert(data.message)
            fetchAllSubscriptions()
        } catch (err) {
            alert('Failed to deactivate: ' + err.message)
        } finally {
            setDeactivatingId(null)
        }
    }

    const handleGrantBadge = async (userId, userEmail) => {
        if (!window.confirm(`Grant verified badge to ${userEmail}?`)) return
        setGrantBadgeLoading(true)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/admin/badges/grant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
                body: JSON.stringify({ user_id: userId, badge_type: 'verified' })
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            alert(data.message)
            fetchAllData()
        } catch (err) {
            alert('Failed to grant badge: ' + err.message)
        } finally {
            setGrantBadgeLoading(false)
            setGrantBadgeUserId('')
        }
    }

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

    const handleUpdateJobStatus = async (jobId, newStatus) => {
        try {
            const res = await fetch(`/api/admin/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to update job status')
            }
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j))
            setJobStatusEdits(prev => { const n = { ...prev }; delete n[jobId]; return n })
        } catch (err) {
            alert('Failed to update job status: ' + err.message)
        }
    }

    const handleSuspendUser = async () => {
        if (!suspendModal) return
        setSuspendSaving(true)
        try {
            const res = await fetch(`/api/admin/users/${suspendModal.id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_suspended: true, suspension_reason: suspendReason })
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to suspend user')
            }
            setUsers(prev => prev.map(u => u.id === suspendModal.id ? { ...u, is_suspended: true, suspension_reason: suspendReason } : u))
            setSuspendModal(null)
            setSuspendReason('')
        } catch (err) {
            alert('Failed to suspend user: ' + err.message)
        } finally {
            setSuspendSaving(false)
        }
    }

    const handleUnsuspendUser = async (userId) => {
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_suspended: false, suspension_reason: '' })
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to unsuspend user')
            }
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_suspended: false, suspension_reason: null } : u))
        } catch (err) {
            alert('Failed to unsuspend user: ' + err.message)
        }
    }

    const handleSaveEditUser = async () => {
        if (!editUserModal) return
        setEditUserSaving(true)
        try {
            const res = await fetch(`/api/admin/users/${editUserModal.id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(editUserData)
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to save user')
            }
            setUsers(prev => prev.map(u => u.id === editUserModal.id ? { ...u, ...editUserData } : u))
            setEditUserModal(null)
        } catch (err) {
            alert('Failed to save user: ' + err.message)
        } finally {
            setEditUserSaving(false)
        }
    }

    const handleApproveVerification = async (badgeId) => {
        try {
            const res = await fetch(`/api/admin/verification-badges/${badgeId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to approve')
            }
            setVerifications(prev => prev.map(v => v.id === badgeId ? { ...v, status: 'approved', reviewed_at: new Date().toISOString() } : v))
            setStats(prev => prev ? { ...prev, pendingVerifications: Math.max(0, prev.pendingVerifications - 1), approvedVerifications: prev.approvedVerifications + 1 } : prev)
        } catch (err) {
            alert('Failed to approve badge: ' + err.message)
        }
    }

    const handleRejectVerification = async () => {
        if (!rejectModal) return
        setRejectSaving(true)
        try {
            const res = await fetch(`/api/admin/verification-badges/${rejectModal.id}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected', rejection_reason: rejectReason })
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to reject')
            }
            setVerifications(prev => prev.map(v => v.id === rejectModal.id ? { ...v, status: 'rejected', rejection_reason: rejectReason, reviewed_at: new Date().toISOString() } : v))
            setStats(prev => prev ? { ...prev, pendingVerifications: Math.max(0, prev.pendingVerifications - 1) } : prev)
            setRejectModal(null)
            setRejectReason('')
        } catch (err) {
            alert('Failed to reject badge: ' + err.message)
        } finally {
            setRejectSaving(false)
        }
    }

    const handleRevokeVerification = async (badgeId) => {
        if (!window.confirm('Revoke this verification badge?')) return
        try {
            const res = await fetch(`/api/admin/verification-badges/${badgeId}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'revoked' })
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body.error || 'Failed to revoke')
            }
            setVerifications(prev => prev.map(v => v.id === badgeId ? { ...v, status: 'revoked', reviewed_at: new Date().toISOString() } : v))
        } catch (err) {
            alert('Failed to revoke badge: ' + err.message)
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

    const filteredVerifications = verifications.filter(v =>
        v.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.status?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const pendingVerifCount = verifications.filter(v => v.status === 'pending').length

    // Permission helper — returns true if admin OR if staff has the given permission
    const can = (permission) => isAdmin || (staffPermissions && staffPermissions[permission] === true)

    const tabs = [
        { id: 'overview', label: '📊 Overview', show: true },
        { id: 'users', label: `👥 Users (${users.length})`, show: can('view_users') },
        { id: 'jobs', label: `💼 Jobs (${jobs.length})`, show: isAdmin || can('view_jobs') },
        { id: 'applications', label: `📋 Applications (${applications.length})`, show: isAdmin || can('view_applications') },
        { id: 'completions', label: `✅ Completions (${completions.length})`, show: isAdmin },
        { id: 'verification', label: `🏅 Verification${pendingVerifCount > 0 ? ` (${pendingVerifCount} pending)` : ''}`, show: isAdmin || can('view_verifications') },
        { id: 'subscriptions', label: `💳 Subscriptions${whatsappRequests.length > 0 ? ` (${whatsappRequests.length} pending)` : ''}`, show: isAdmin || can('view_subscriptions') },
        { id: 'emails', label: '✉️ Emails', show: isAdmin || can('trigger_campaigns') },
    ].filter(t => t.show)

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
                            <Link
                                href="/admin/settings"
                                className="bg-indigo-500 hover:bg-indigo-700 px-4 py-2 rounded font-semibold transition text-sm inline-block"
                            >
                                ⚙️ Settings
                            </Link>
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
                                    <div className="bg-white shadow-lg rounded-lg p-6 border-t-4 border-indigo-600">
                                        <p className="text-gray-500 text-sm font-medium">Verification Badges</p>
                                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalVerifications}</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {stats.pendingVerifications > 0 && <span className="text-amber-600 font-semibold">⚠ {stats.pendingVerifications} pending · </span>}
                                            ✓ {stats.approvedVerifications} approved
                                        </p>
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
                                                <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 ${user.is_suspended ? 'bg-red-50' : ''}`}>
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
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                                                        {can('view_contact_info') ? (user.phone_number || '—') : <span className="text-gray-300">••••••</span>}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{new Date(user.created_at).toLocaleDateString()}</td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        {user.is_suspended ? (
                                                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Suspended</span>
                                                        ) : (
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                {user.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 sm:px-6 py-4 text-sm">
                                                        {user.user_type !== 'admin' && (
                                                            <div className="flex flex-wrap gap-2">
                                                                {can('edit_users') && (
                                                                    <button
                                                                        onClick={() => { setEditUserModal(user); setEditUserData({ first_name: user.first_name, last_name: user.last_name }) }}
                                                                        className="text-indigo-600 hover:text-indigo-900 font-medium text-xs"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                )}
                                                                {isAdmin && (
                                                                    user.is_suspended ? (
                                                                        <button
                                                                            onClick={() => handleUnsuspendUser(user.id)}
                                                                            className="text-green-600 hover:text-green-900 font-medium text-xs"
                                                                        >
                                                                            Unsuspend
                                                                        </button>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => { setSuspendModal(user); setSuspendReason('') }}
                                                                            className="text-amber-600 hover:text-amber-900 font-medium text-xs"
                                                                        >
                                                                            Suspend
                                                                        </button>
                                                                    )
                                                                )}
                                                                {can('delete_users') && (
                                                                    <button
                                                                        onClick={() => handleDeleteUser(user.id)}
                                                                        className="text-red-600 hover:text-red-900 font-medium text-xs"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                                {can('send_email') && user.email && (
                                                                    <a
                                                                        href={`mailto:${user.email}`}
                                                                        className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                                                                    >
                                                                        Email
                                                                    </a>
                                                                )}
                                                                {can('send_whatsapp') && user.phone_number && (
                                                                    <a
                                                                        href={`https://wa.me/${user.phone_number.replace(/\D/g, '')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-green-600 hover:text-green-900 font-medium text-xs"
                                                                    >
                                                                        WhatsApp
                                                                    </a>
                                                                )}
                                                            </div>
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
                                                        {jobStatusEdits[job.id] !== undefined ? (
                                                            <div className="flex items-center gap-1">
                                                                <select
                                                                    value={jobStatusEdits[job.id]}
                                                                    onChange={e => setJobStatusEdits(prev => ({ ...prev, [job.id]: e.target.value }))}
                                                                    className="text-xs border border-gray-300 rounded px-1 py-1"
                                                                >
                                                                    <option value="active">active</option>
                                                                    <option value="completed">completed</option>
                                                                    <option value="cancelled">cancelled</option>
                                                                    <option value="paused">paused</option>
                                                                </select>
                                                                <button onClick={() => handleUpdateJobStatus(job.id, jobStatusEdits[job.id])} className="text-green-600 hover:text-green-900 text-xs font-bold">✓</button>
                                                                <button onClick={() => setJobStatusEdits(prev => { const n = { ...prev }; delete n[job.id]; return n })} className="text-gray-400 hover:text-gray-700 text-xs font-bold">✕</button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setJobStatusEdits(prev => ({ ...prev, [job.id]: job.status }))}
                                                                className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:opacity-80 ${job.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                                                    job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                        'bg-gray-100 text-gray-800'}`}
                                                            >
                                                                {job.status} ✎
                                                            </button>
                                                        )}
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

                        {/* Verification Badges Tab */}
                        {activeTab === 'verification' && (
                            <div className="space-y-8">
                                {/* Grant Badge Directly */}
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">Grant Verified Badge Directly</h3>
                                    <p className="text-sm text-gray-500 mb-4">Bypass the request flow and grant a verified badge immediately to any user.</p>
                                    <div className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <label className="block text-xs font-semibold text-gray-600 mb-1">Select User</label>
                                            <select
                                                value={grantBadgeUserId}
                                                onChange={e => setGrantBadgeUserId(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">— Select a user —</option>
                                                {users.map(u => (
                                                    <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.email})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const u = users.find(u => u.id === grantBadgeUserId)
                                                if (u) handleGrantBadge(u.id, u.email)
                                            }}
                                            disabled={!grantBadgeUserId || grantBadgeLoading}
                                            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                                        >
                                            {grantBadgeLoading ? '…' : '✓ Grant Badge'}
                                        </button>
                                    </div>
                                </div>

                                {/* Existing Requests */}
                                <div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                                        <div>
                                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Verification Badge Requests</h2>
                                            {pendingVerifCount > 0 && (
                                                <p className="text-sm text-amber-600 font-medium mt-1">⚠ {pendingVerifCount} request{pendingVerifCount !== 1 ? 's' : ''} awaiting review</p>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full sm:w-64 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    {filteredVerifications.length === 0 ? (
                                        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500 text-sm">No verification requests found.</div>
                                    ) : (
                                        <div className="bg-white shadow-lg rounded-lg overflow-x-auto">
                                            <table className="w-full min-w-max">
                                                <thead className="bg-gray-100 border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">User</th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Email</th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Type</th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Badge Type</th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Status</th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Submitted</th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Reviewed</th>
                                                        <th className="px-4 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {filteredVerifications.map(v => (
                                                        <tr key={v.id} className={`border-b border-gray-100 hover:bg-gray-50 ${v.status === 'pending' ? 'bg-amber-50' : ''}`}>
                                                            <td className="px-4 sm:px-6 py-4 text-sm font-medium text-gray-900">
                                                                {v.user ? `${v.user.first_name} ${v.user.last_name}` : '—'}
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{v.user?.email || '—'}</td>
                                                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${v.user?.user_type === 'worker' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                                    {v.user?.user_type || '—'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 capitalize">{v.badge_type || '—'}</td>
                                                            <td className="px-4 sm:px-6 py-4 text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${v.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                                                    v.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                        v.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                            'bg-gray-100 text-gray-800'}`}>
                                                                    {v.status}
                                                                </span>
                                                                {v.status === 'rejected' && v.rejection_reason && (
                                                                    <p className="text-xs text-red-500 mt-1 max-w-[180px] truncate" title={v.rejection_reason}>{v.rejection_reason}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                                                                {v.submitted_at ? new Date(v.submitted_at).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">
                                                                {v.reviewed_at ? new Date(v.reviewed_at).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="px-4 sm:px-6 py-4 text-sm">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {v.status === 'pending' && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => handleApproveVerification(v.id)}
                                                                                className="text-green-600 hover:text-green-900 font-semibold text-xs"
                                                                            >
                                                                                ✓ Approve
                                                                            </button>
                                                                            <button
                                                                                onClick={() => { setRejectModal(v); setRejectReason('') }}
                                                                                className="text-red-600 hover:text-red-900 font-semibold text-xs"
                                                                            >
                                                                                ✕ Reject
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {v.status === 'approved' && (
                                                                        <button
                                                                            onClick={() => handleRevokeVerification(v.id)}
                                                                            className="text-amber-600 hover:text-amber-900 font-medium text-xs"
                                                                        >
                                                                            Revoke
                                                                        </button>
                                                                    )}
                                                                    {v.status === 'rejected' && (
                                                                        <button
                                                                            onClick={() => handleApproveVerification(v.id)}
                                                                            className="text-green-600 hover:text-green-900 font-medium text-xs"
                                                                        >
                                                                            Approve
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Subscriptions Tab */}
                        {activeTab === 'subscriptions' && (
                            <div className="space-y-8">
                                {/* All Subscriptions */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">All Subscriptions</h2>
                                            <p className="text-sm text-gray-500 mt-1">Overview of every user's subscription status.</p>
                                        </div>
                                        <button
                                            onClick={fetchAllSubscriptions}
                                            disabled={allSubsLoading}
                                            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                                        >
                                            {allSubsLoading ? '…' : '↻ Refresh'}
                                        </button>
                                    </div>

                                    {allSubsLoading ? (
                                        <p className="text-gray-500 text-center py-8">Loading…</p>
                                    ) : allSubscriptions.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-gray-400 text-3xl mb-2">💳</p>
                                            <p className="text-gray-500 font-medium">No subscriptions found.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl shadow-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        {['User', 'Plan', 'Status', 'Period End', 'Billing', 'Actions'].map(h => (
                                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {allSubscriptions.map((sub) => (
                                                        <tr key={sub.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">
                                                                <p className="font-medium text-gray-900 text-sm">{sub.user?.first_name} {sub.user?.last_name}</p>
                                                                <p className="text-xs text-gray-500">{sub.user?.email}</p>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                                    {sub.plan_id}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                    sub.status === 'trialing' ? 'bg-blue-100 text-blue-700' :
                                                                        sub.status === 'payment_due' ? 'bg-yellow-100 text-yellow-700' :
                                                                            sub.status === 'inactive' || sub.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {sub.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                                {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-700 capitalize">{sub.billing_cycle || '—'}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex gap-2">
                                                                    {sub.status !== 'active' && (
                                                                        <button
                                                                            onClick={() => handleActivateSubscription({ user: sub.user, user_id: sub.user_id, plan_id: sub.plan_id, billing_cycle: sub.billing_cycle }, sub.billing_cycle)}
                                                                            disabled={activatingId === sub.user_id}
                                                                            className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                                                        >
                                                                            {activatingId === sub.user_id ? '…' : '✓ Activate'}
                                                                        </button>
                                                                    )}
                                                                    {sub.status === 'active' && (
                                                                        <button
                                                                            onClick={() => handleDeactivateSubscription(sub.user_id, sub.user?.email)}
                                                                            disabled={deactivatingId === sub.user_id}
                                                                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-700 transition disabled:opacity-50"
                                                                        >
                                                                            {deactivatingId === sub.user_id ? '…' : '✗ Deactivate'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>

                                {/* Pending WhatsApp Requests */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">Pending WhatsApp Requests</h3>
                                            <p className="text-sm text-gray-500 mt-1">Manual activation required for WhatsApp payment requests.</p>
                                        </div>
                                        <button
                                            onClick={fetchWhatsappRequests}
                                            disabled={subLoading}
                                            className="bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-50"
                                        >
                                            {subLoading ? '…' : '↻ Refresh'}
                                        </button>
                                    </div>

                                    {subLoading ? (
                                        <p className="text-gray-500 text-center py-8">Loading requests…</p>
                                    ) : whatsappRequests.length === 0 ? (
                                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <p className="text-gray-400 text-3xl mb-2">💳</p>
                                            <p className="text-gray-500 font-medium">No pending WhatsApp subscription requests.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-xl shadow-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        {['User', 'Plan', 'Billing', 'Requested', 'Actions'].map(h => (
                                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {whatsappRequests.map((req) => (
                                                        <tr key={req.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">
                                                                <p className="font-medium text-gray-900 text-sm">{req.user?.first_name} {req.user?.last_name}</p>
                                                                <p className="text-xs text-gray-500">{req.user?.email}</p>
                                                                {req.user?.phone_number && (
                                                                    <a
                                                                        href={`https://wa.me/${req.user.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi! We received your GoArtisans subscription request for the ${req.plan_id} plan. Please share your payment confirmation.`)}`}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="text-xs text-green-600 underline"
                                                                    >
                                                                        WhatsApp: {req.user.phone_number}
                                                                    </a>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                                                                    {req.plan_id}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-700 capitalize">{req.billing_cycle}</td>
                                                            <td className="px-4 py-3 text-xs text-gray-500">
                                                                {req.updated_at ? new Date(req.updated_at).toLocaleString() : '—'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() => handleActivateSubscription(req, req.billing_cycle)}
                                                                        disabled={activatingId === req.user?.id}
                                                                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-700 transition disabled:opacity-50"
                                                                    >
                                                                        {activatingId === req.user?.id ? '…' : '✓ Activate'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleActivateSubscription({ ...req, billing_cycle: req.billing_cycle === 'monthly' ? 'yearly' : 'monthly' }, req.billing_cycle === 'monthly' ? 'yearly' : 'monthly')}
                                                                        disabled={activatingId === req.user?.id}
                                                                        className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                                                                    >
                                                                        Activate as {req.billing_cycle === 'monthly' ? 'yearly' : 'monthly'}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
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

            {/* ── EDIT USER MODAL ── */}
            {editUserModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Edit User</h3>
                        <p className="text-xs text-gray-500 mb-4">{editUserModal.email}</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                                <input
                                    type="text"
                                    value={editUserData.first_name || ''}
                                    onChange={e => setEditUserData(prev => ({ ...prev, first_name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                                <input
                                    type="text"
                                    value={editUserData.last_name || ''}
                                    onChange={e => setEditUserData(prev => ({ ...prev, last_name: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSaveEditUser}
                                disabled={editUserSaving}
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition"
                            >
                                {editUserSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button
                                onClick={() => setEditUserModal(null)}
                                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SUSPEND USER MODAL ── */}
            {suspendModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Suspend User</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Suspending <strong>{suspendModal.first_name} {suspendModal.last_name}</strong>. They will not be able to log in.
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
                            <textarea
                                rows={3}
                                value={suspendReason}
                                onChange={e => setSuspendReason(e.target.value)}
                                placeholder="e.g. Violation of terms of service…"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={handleSuspendUser}
                                disabled={suspendSaving}
                                className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition"
                            >
                                {suspendSaving ? 'Suspending…' : 'Suspend'}
                            </button>
                            <button
                                onClick={() => setSuspendModal(null)}
                                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── REJECT BADGE MODAL ── */}
            {rejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Verification Request</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Rejecting badge request from <strong>{rejectModal.user?.first_name} {rejectModal.user?.last_name}</strong>.
                        </p>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Rejection Reason (shown to user)</label>
                            <textarea
                                rows={3}
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="e.g. ID document was unclear, please resubmit with a clearer image…"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            />
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button
                                onClick={handleRejectVerification}
                                disabled={rejectSaving}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg text-sm transition"
                            >
                                {rejectSaving ? 'Rejecting…' : 'Reject'}
                            </button>
                            <button
                                onClick={() => setRejectModal(null)}
                                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
