'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import NotificationPreferencesModal from '@/components/NotificationPreferencesModal'
import { useLanguage } from '@/context/LanguageContext'
import { useSubscription } from '@/context/SubscriptionContext'
import VerifiedBadge from '@/components/VerifiedBadge'
import ReferralBadge from '@/components/ReferralBadge'

function NotificationsContent() {
    const { t } = useLanguage()
    const { isPro, isPremium, isTrialing, badge, loading: subLoading } = useSubscription()
    const canAccessViews = isPro || isPremium || isTrialing
    const canRequestVerification = isPro || isPremium || isTrialing

    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('new')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [showSettings, setShowSettings] = useState(false)
    const searchParams = useSearchParams()
    const [notifTab, setNotifTab] = useState(() => {
        const tab = searchParams?.get('tab')
        return ['job_alerts', 'followers', 'profile_views', 'verification', 'support', 'ai_matches', 'referrals', 'saved_workers'].includes(tab) ? tab : 'job_alerts'
    }) // 'job_alerts' | 'followers' | 'profile_views' | 'verification' | 'support' | 'ai_matches' | 'referrals'
    const [followNotifications, setFollowNotifications] = useState([])
    const [followLoading, setFollowLoading] = useState(false)

    // Profile Views & Analytics state
    const [profileViewers, setProfileViewers] = useState([])
    const [profileViewsLoading, setProfileViewsLoading] = useState(false)
    const [profileViewsError, setProfileViewsError] = useState('')
    const [viewsDaysRange, setViewsDaysRange] = useState(30) // 30 | 60 | 90

    // Verification badge request state
    const [verifSelfieFile, setVerifSelfieFile] = useState(null)
    const [verifSelfiePreview, setVerifSelfiePreview] = useState(null)
    const [verifIdType, setVerifIdType] = useState('')
    const [verifIdFile, setVerifIdFile] = useState(null)
    const [verifIdPreview, setVerifIdPreview] = useState(null)
    const [verifSubmitting, setVerifSubmitting] = useState(false)
    const [verifSubmitted, setVerifSubmitted] = useState(false)
    const [verifError, setVerifError] = useState('')

    // Support form state
    const [supportCategory, setSupportCategory] = useState('General')
    const [supportMessage, setSupportMessage] = useState('')
    const [supportContactMethod, setSupportContactMethod] = useState('email')
    const [supportContactDetail, setSupportContactDetail] = useState('')
    const [supportSending, setSupportSending] = useState(false)
    const [supportSuccess, setSupportSuccess] = useState(false)
    const [supportError, setSupportError] = useState('')

    // AI Job Matches state
    const [aiMatches, setAiMatches] = useState([])
    const [aiMatchesLoading, setAiMatchesLoading] = useState(false)
    const [aiMatchesError, setAiMatchesError] = useState('')
    const [aiMatchesFetched, setAiMatchesFetched] = useState(false)
    const [applyingJobId, setApplyingJobId] = useState(null)
    const [dismissedJobIds, setDismissedJobIds] = useState(new Set())
    const [appliedJobIds, setAppliedJobIds] = useState(new Set())
    const [currentUserType, setCurrentUserType] = useState(null)
    const [workerProfile, setWorkerProfile] = useState(null)

    // Referrals state
    const [referralData, setReferralData] = useState(null)
    const [referralLoading, setReferralLoading] = useState(false)
    const [referralError, setReferralError] = useState('')
    const [referralCopied, setReferralCopied] = useState(false)
    const [referralFetched, setReferralFetched] = useState(false)

    // Saved Workers state
    const [savedWorkers, setSavedWorkers] = useState([])
    const [savedWorkersLoading, setSavedWorkersLoading] = useState(false)
    const [savedWorkersFetched, setSavedWorkersFetched] = useState(false)
    const [removingSavedId, setRemovingSavedId] = useState(null)

    // Job posting analytics state (Pro clients)
    const [jobAnalytics, setJobAnalytics] = useState(null)
    const [jobAnalyticsLoading, setJobAnalyticsLoading] = useState(false)

    const LIMIT = 20
    const statusLabel = (status) => {
        const map = {
            new: t('statusNew'),
            viewed: t('statusViewed'),
            applied: t('statusApplied'),
            dismissed: t('statusDismissed')
        }
        return map[status] || status
    }

    useEffect(() => {
        fetchNotifications()
        fetchUnreadCount()
        fetchFollowNotifications()

        if (!subLoading && canAccessViews) {
            fetchProfileViews(viewsDaysRange)
        }

        // Fetch job analytics for pro/premium clients
        if (!subLoading && (isPro || isPremium || isTrialing)) {
            fetchJobAnalytics()
        }

        let channels = []
        const setupRealtime = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return
            const userId = session.user.id

            const jobChannel = supabase
                .channel(`page-job-notifs-${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'job_notifications',
                    filter: `worker_id=eq.${userId}`
                }, () => { fetchNotifications(); fetchUnreadCount() })
                .subscribe()

            const notifChannel = supabase
                .channel(`page-user-notifs-${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, () => { fetchFollowNotifications(); fetchUnreadCount() })
                .subscribe()

            channels = [jobChannel, notifChannel]
        }

        setupRealtime()

        // Fetch current user type + basic profile
        const loadUserType = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return
            const { data } = await supabase
                .from('users')
                .select('user_type, job_title, bio, location, services, years_experience')
                .eq('id', session.user.id)
                .single()
            if (data) {
                setCurrentUserType(data.user_type)
                setWorkerProfile(data)
            }
        }
        loadUserType()

        return () => {
            channels.forEach(ch => supabase.removeChannel(ch))
        }
    }, [statusFilter, page])

    const fetchNotifications = async () => {
        try {
            setLoading(true)

            // Calculate offset for pagination
            const offset = (page - 1) * LIMIT

            // Query notifications with job details
            let query = supabase
                .from('job_notifications')
                .select(`
                    id,
                    status,
                    viewed_at,
                    created_at,
                    jobs (title, description, location, budget),
                    job_alerts (name)
                `, { count: 'exact' })

            if (statusFilter && statusFilter !== 'all') {
                query = query.eq('status', statusFilter)
            }

            const { data, count, error: err } = await query
                .order('created_at', { ascending: false })
                .range(offset, offset + LIMIT - 1)

            if (err) throw err

            // Map the data to match the expected format
            const formatted = data?.map(n => ({
                id: n.id,
                status: n.status,
                viewed_at: n.viewed_at,
                created_at: n.created_at,
                job_title: n.jobs?.[0]?.title,
                job_description: n.jobs?.[0]?.description,
                job_location: n.jobs?.[0]?.location,
                job_budget: n.jobs?.[0]?.budget,
                alert_name: n.job_alerts?.[0]?.name
            })) || []

            setNotifications(formatted)
            setTotalPages(Math.ceil((count || 0) / LIMIT))
            setError('')
        } catch (err) {
            console.error('[Fetch Notifications Error]', err)
            setError(t('failedLoadNotifications'))
        } finally {
            setLoading(false)
        }
    }

    const fetchUnreadCount = async () => {
        try {
            const { count, error: err } = await supabase
                .from('job_notifications')
                .select('*', { count: 'exact' })
                .eq('status', 'new')

            if (err) throw err

            setUnreadCount(count || 0)
        } catch (err) {
            console.error('[Fetch Unread Error]', err)
        }
    }

    const fetchFollowNotifications = async () => {
        try {
            setFollowLoading(true)
            const { data, error: err } = await supabase
                .from('notifications')
                .select('id, type, title, message, is_read, action_url, created_at, related_user_id')
                .eq('type', 'follow')
                .order('created_at', { ascending: false })
                .limit(50)

            if (err) throw err
            setFollowNotifications(data || [])
        } catch (err) {
            console.error('[Fetch Follow Notifications Error]', err)
        } finally {
            setFollowLoading(false)
        }
    }

    const fetchProfileViews = async (days) => {
        try {
            setProfileViewsLoading(true)
            setProfileViewsError('')
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) { setProfileViewsLoading(false); return }

            const since = new Date()
            since.setDate(since.getDate() - days)

            const { data, error: err } = await supabase
                .from('profile_views')
                .select(`
                    viewed_at,
                    view_date,
                    viewer:viewer_id (
                        id,
                        first_name,
                        last_name,
                        job_title,
                        profile_picture,
                        user_type
                    )
                `)
                .eq('viewed_id', session.user.id)
                .gte('view_date', since.toISOString().slice(0, 10))
                .order('viewed_at', { ascending: false })
                .limit(200)

            if (err) throw err
            setProfileViewers(data || [])
        } catch (err) {
            console.error('[Profile Views Error]', err)
            setProfileViewsError('Failed to load profile views.')
        } finally {
            setProfileViewsLoading(false)
        }
    }

    const fetchAiMatches = async () => {
        try {
            setAiMatchesLoading(true)
            setAiMatchesError('')
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) { setAiMatchesError('Please log in to see AI matches.'); return }

            const res = await fetch('/api/ai-job-matches', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Failed to load matches.')
            setAiMatches(json.matches || [])
            setAiMatchesFetched(true)
        } catch (err) {
            setAiMatchesError(err.message || 'Something went wrong.')
        } finally {
            setAiMatchesLoading(false)
        }
    }

    const handleAiApply = async (job) => {
        try {
            setApplyingJobId(job.id)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) return

            const { error: err } = await supabase
                .from('applications')
                .insert({ job_id: job.id, worker_id: session.user.id, status: 'pending', created_at: new Date().toISOString() })

            if (err) throw err
            setAppliedJobIds(prev => new Set([...prev, job.id]))
        } catch (err) {
            console.error('[AI Apply Error]', err)
        } finally {
            setApplyingJobId(null)
        }
    }

    const handleAiDismiss = (jobId) => {
        setDismissedJobIds(prev => new Set([...prev, jobId]))
    }

    const fetchReferralData = async () => {
        setReferralLoading(true)
        setReferralError('')
        setReferralFetched(true)
        try {
            // Use getUser() for a live check — avoids stale cached sessions
            const { data: { user }, error: userErr } = await supabase.auth.getUser()
            if (userErr || !user) {
                setReferralError('not_logged_in')
                return
            }
            // Get the session for the bearer token
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                setReferralError('not_logged_in')
                return
            }
            const res = await fetch('/api/referrals', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
            const json = await res.json()
            if (res.ok) {
                setReferralData(json)
            } else if (res.status === 401) {
                // 401 despite being logged in = expired token, try refreshing
                const { data: refreshed } = await supabase.auth.refreshSession()
                if (!refreshed?.session?.access_token) {
                    setReferralError('not_logged_in')
                    return
                }
                const retry = await fetch('/api/referrals', {
                    headers: { Authorization: `Bearer ${refreshed.session.access_token}` }
                })
                const retryJson = await retry.json()
                if (retry.ok) {
                    setReferralData(retryJson)
                } else {
                    setReferralError(retryJson.error || 'Failed to load referral data.')
                }
            } else {
                setReferralError(json.error || 'Failed to load referral data.')
            }
        } catch (_) {
            setReferralError('Could not load referral data. Please try again.')
        } finally {
            setReferralLoading(false)
        }
    }

    const handleCopyReferralLink = async () => {
        if (!referralData?.referral_link) return
        try {
            await navigator.clipboard.writeText(referralData.referral_link)
            setReferralCopied(true)
            setTimeout(() => setReferralCopied(false), 2500)
        } catch (_) {
            // fallback
            const el = document.createElement('textarea')
            el.value = referralData.referral_link
            document.body.appendChild(el)
            el.select()
            document.execCommand('copy')
            document.body.removeChild(el)
            setReferralCopied(true)
            setTimeout(() => setReferralCopied(false), 2500)
        }
    }

    const fetchSavedWorkers = async () => {
        setSavedWorkersLoading(true)
        setSavedWorkersFetched(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { setSavedWorkersLoading(false); return }
            const { data, error } = await supabase
                .from('saved_workers')
                .select(`
                    worker_id,
                    saved_at,
                    worker:users!saved_workers_worker_id_fkey(
                        id, first_name, last_name, job_title, location,
                        profile_picture, rating, is_active, bio
                    )
                `)
                .eq('client_id', session.user.id)
                .order('saved_at', { ascending: false })
            if (!error && data) {
                setSavedWorkers(data.map(row => ({ ...row.worker, saved_at: row.saved_at })))
            }
        } catch (_) { }
        setSavedWorkersLoading(false)
    }

    const handleUnsaveWorker = async (workerId) => {
        setRemovingSavedId(workerId)
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
            await supabase
                .from('saved_workers')
                .delete()
                .eq('client_id', session.user.id)
                .eq('worker_id', workerId)
            setSavedWorkers(prev => prev.filter(w => w.id !== workerId))
        }
        setRemovingSavedId(null)
    }

    const fetchJobAnalytics = async () => {
        setJobAnalyticsLoading(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) { setJobAnalyticsLoading(false); return }
            const userId = session.user.id

            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            // Fetch all jobs for this client (with title for premium top-jobs)
            const { data: jobs, error: jobsErr } = await supabase
                .from('jobs')
                .select('id, status, created_at, title')
                .eq('client_id', userId)

            if (jobsErr || !jobs) { setJobAnalyticsLoading(false); return }

            const jobIds = jobs.map(j => j.id)

            // Run counts in parallel
            const [totalAppsResult, appsThisMonthResult] = await Promise.all([
                jobIds.length > 0
                    ? supabase.from('applications').select('id', { count: 'exact', head: true }).in('job_id', jobIds)
                    : Promise.resolve({ count: 0 }),
                jobIds.length > 0
                    ? supabase.from('applications').select('id', { count: 'exact', head: true }).in('job_id', jobIds).gte('created_at', startOfMonth.toISOString())
                    : Promise.resolve({ count: 0 })
            ])

            // Jobs posted this month
            const jobsThisMonth = jobs.filter(j => new Date(j.created_at) >= startOfMonth).length

            // Jobs by status
            const byStatus = jobs.reduce((acc, j) => {
                acc[j.status] = (acc[j.status] || 0) + 1
                return acc
            }, {})

            // Premium-only: application status breakdown + top jobs by applicant count
            let appsByStatus = null
            let topJobs = null
            if ((isPremium || isTrialing) && jobIds.length > 0) {
                const { data: allApps } = await supabase
                    .from('applications')
                    .select('job_id, status')
                    .in('job_id', jobIds)

                if (allApps) {
                    // Status breakdown
                    appsByStatus = allApps.reduce((acc, a) => {
                        acc[a.status] = (acc[a.status] || 0) + 1
                        return acc
                    }, {})

                    // Top 5 jobs by application count
                    const jobAppCounts = jobIds.map(jid => ({
                        id: jid,
                        title: jobs.find(j => j.id === jid)?.title || 'Untitled',
                        status: jobs.find(j => j.id === jid)?.status || '',
                        count: allApps.filter(a => a.job_id === jid).length
                    }))
                    topJobs = jobAppCounts.sort((a, b) => b.count - a.count).slice(0, 5)
                }
            }

            setJobAnalytics({
                totalJobs: jobs.length,
                jobsThisMonth,
                totalApplications: totalAppsResult.count || 0,
                applicationsThisMonth: appsThisMonthResult.count || 0,
                byStatus,
                appsByStatus,
                topJobs
            })
        } catch (_) { }
        setJobAnalyticsLoading(false)
    }

    const handleSupportSubmit = async (e) => {
        e.preventDefault()
        setSupportError('')
        if (!supportMessage.trim() || supportMessage.trim().length < 10) {
            setSupportError('Please describe your issue (at least 10 characters).')
            return
        }
        if (!supportContactDetail.trim()) {
            setSupportError('Please provide a contact detail so we can reach you.')
            return
        }
        setSupportSending(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            const headers = { 'Content-Type': 'application/json' }
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

            const res = await fetch('/api/support', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    category: supportCategory,
                    message: supportMessage,
                    contactMethod: supportContactMethod,
                    contactDetail: supportContactDetail,
                })
            })
            const json = await res.json()
            if (!res.ok) throw new Error(json.error || 'Failed to send.')
            setSupportSuccess(true)
            setSupportMessage('')
            setSupportContactDetail('')
        } catch (err) {
            setSupportError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setSupportSending(false)
        }
    }

    const handleMarkFollowRead = async (notifId) => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notifId)
            setFollowNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
            fetchUnreadCount()
        } catch (err) {
            console.error('[Mark Follow Read Error]', err)
        }
    }

    const handleMarkAllFollowRead = async () => {
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('type', 'follow')
                .eq('is_read', false)
            setFollowNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
            fetchUnreadCount()
        } catch (err) {
            console.error('[Mark All Read Error]', err)
        }
    }

    const handleMarkAsViewed = async (notificationId) => {
        try {
            const { error: err } = await supabase
                .from('job_notifications')
                .update({ status: 'viewed', viewed_at: new Date().toISOString() })
                .eq('id', notificationId)

            if (err) throw err

            setNotifications(notifications.map(n =>
                n.id === notificationId ? { ...n, status: 'viewed' } : n
            ))
            fetchUnreadCount()
        } catch (err) {
            console.error('[Mark Viewed Error]', err)
        }
    }

    const handleDismiss = async (notificationId) => {
        try {
            const { error: err } = await supabase
                .from('job_notifications')
                .update({ status: 'dismissed' })
                .eq('id', notificationId)

            if (err) throw err

            setNotifications(notifications.filter(n => n.id !== notificationId))
            fetchUnreadCount()
        } catch (err) {
            console.error('[Dismiss Error]', err)
        }
    }

    if (loading && notifications.length === 0) {
        return (
            <div className="min-h-screen p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-slate-600 font-semibold">{t('loadingNotifications')}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen p-3 sm:p-4 lg:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 fade-in-up">
                    <div className="min-w-0">
                        <h1 className="display-font text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{t('notificationsTitle')}</h1>
                        {unreadCount > 0 && (
                            <p className="text-slate-600 mt-2 text-sm sm:text-base leading-relaxed">
                                {t('youHaveNewNotifications').replace('{{count}}', unreadCount)}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-full sm:w-auto text-slate-600 hover:text-slate-900 font-semibold text-sm flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 border border-transparent"
                    >
                        ⚙️ {t('settings')}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Main Tab Switcher */}
                <div className="mb-6 overflow-x-auto pb-1">
                    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-max min-w-full sm:min-w-0 sm:w-fit">
                        <button
                            onClick={() => setNotifTab('job_alerts')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${notifTab === 'job_alerts' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            📋 Job Alerts
                        </button>
                        <button
                            onClick={() => setNotifTab('followers')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${notifTab === 'followers' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            👥 Followers
                            {followNotifications.filter(n => !n.is_read).length > 0 && (
                                <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none">
                                    {followNotifications.filter(n => !n.is_read).length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                setNotifTab('profile_views')
                                if (canAccessViews && profileViewers.length === 0) fetchProfileViews(viewsDaysRange)
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${notifTab === 'profile_views' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            👁️ Profile Views
                        </button>
                        <button
                            onClick={() => { setNotifTab('verification'); setVerifError(''); setVerifSubmitted(false) }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${notifTab === 'verification' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            <VerifiedBadge size={16} /> Verified Badge
                        </button>
                        {currentUserType === 'worker' && (
                            <button
                                onClick={() => {
                                    setNotifTab('ai_matches')
                                    if (isPremium && !aiMatchesFetched) fetchAiMatches()
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${notifTab === 'ai_matches' ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                🤖 AI Job Matches
                                {!isPremium && <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-1.5 py-0.5 font-semibold">Premium</span>}
                            </button>
                        )}
                        <button
                            onClick={() => { setNotifTab('support'); setSupportSuccess(false); setSupportError('') }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${notifTab === 'support' ? 'bg-white shadow text-purple-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            💎 Support
                            {!isPremium && <span className="text-xs bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-1.5 py-0.5 font-semibold">Premium</span>}
                        </button>
                        <button
                            onClick={() => {
                                setNotifTab('referrals')
                                if (!referralFetched) fetchReferralData()
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${notifTab === 'referrals' ? 'bg-white shadow text-emerald-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            🎁 Referrals
                        </button>
                        <button
                            onClick={() => {
                                setNotifTab('saved_workers')
                                if (!savedWorkersFetched) fetchSavedWorkers()
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${notifTab === 'saved_workers' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            🔖 Saved Workers
                        </button>
                    </div>
                </div>

                {/* ── JOB ALERTS TAB ── */}
                {notifTab === 'job_alerts' && (<>

                    {/* ── JOB POSTING ANALYTICS (Pro/Premium clients) ── */}
                    {(isPro || isPremium || isTrialing) && currentUserType === 'client' && (
                        <div className="mb-6">
                            {jobAnalyticsLoading ? (
                                <div className="elevated-card rounded-2xl p-5 border border-white/80 text-center text-slate-500 text-sm">Loading analytics…</div>
                            ) : jobAnalytics ? (
                                <div className="elevated-card rounded-2xl p-5 border border-white/80">
                                    <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                                        📊 Job Posting Analytics
                                        {isPremium && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-indigo-500 to-purple-600 text-white">💎 Advanced</span>}
                                        <span className="text-xs font-normal text-slate-500">(this month + all time)</span>
                                    </h3>

                                    {/* Core stats — Pro + Premium */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-bold text-blue-700">{jobAnalytics.jobsThisMonth}</p>
                                            <p className="text-xs text-blue-600 font-medium">Jobs posted<br />this month</p>
                                        </div>
                                        <div className="bg-indigo-50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-bold text-indigo-700">{jobAnalytics.totalJobs}</p>
                                            <p className="text-xs text-indigo-600 font-medium">Total jobs<br />posted</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-bold text-emerald-700">{jobAnalytics.applicationsThisMonth}</p>
                                            <p className="text-xs text-emerald-600 font-medium">Applications<br />this month</p>
                                        </div>
                                        <div className="bg-violet-50 rounded-xl p-3 text-center">
                                            <p className="text-2xl font-bold text-violet-700">{jobAnalytics.totalApplications}</p>
                                            <p className="text-xs text-violet-600 font-medium">Total<br />applications</p>
                                        </div>
                                    </div>

                                    {/* Jobs by status pill tags */}
                                    {jobAnalytics.byStatus && Object.keys(jobAnalytics.byStatus).length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {Object.entries(jobAnalytics.byStatus).map(([status, count]) => (
                                                <span key={status} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                                                    {status === 'open' ? '🟢' : status === 'completed' ? '✅' : status === 'closed' ? '🔴' : '⏸'} {status}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── PREMIUM-ONLY: advanced applicant analytics ── */}
                                    {(isPremium || isTrialing) && (
                                        <>
                                            {/* Application status breakdown */}
                                            {jobAnalytics.appsByStatus && Object.keys(jobAnalytics.appsByStatus).length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                                                        💎 Applicant Status Breakdown
                                                    </p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {Object.entries(jobAnalytics.appsByStatus).map(([status, count]) => {
                                                            const total = jobAnalytics.totalApplications || 1
                                                            const pct = Math.round((count / total) * 100)
                                                            const colors = {
                                                                pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
                                                                accepted: 'bg-green-50 text-green-700 border-green-200',
                                                                rejected: 'bg-red-50 text-red-700 border-red-200',
                                                                completed: 'bg-blue-50 text-blue-700 border-blue-200',
                                                            }
                                                            const colorClass = colors[status] || 'bg-slate-50 text-slate-700 border-slate-200'
                                                            return (
                                                                <div key={status} className={`rounded-lg border p-2 text-center ${colorClass}`}>
                                                                    <p className="text-lg font-bold">{count}</p>
                                                                    <p className="text-xs capitalize font-medium">{status}</p>
                                                                    <p className="text-xs opacity-70">{pct}%</p>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Top jobs by applications */}
                                            {jobAnalytics.topJobs && jobAnalytics.topJobs.length > 0 && (
                                                <div className="mt-4 pt-4 border-t border-slate-100">
                                                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                                                        🏆 Top Jobs by Applications
                                                    </p>
                                                    <div className="space-y-2">
                                                        {jobAnalytics.topJobs.map((job, i) => (
                                                            <div key={job.id} className="flex items-center gap-3">
                                                                <span className="text-xs font-bold text-slate-400 w-4">#{i + 1}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-semibold text-slate-800 truncate">{job.title}</p>
                                                                    <p className="text-xs text-slate-500 capitalize">{job.status}</p>
                                                                </div>
                                                                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                    {job.count} app{job.count !== 1 ? 's' : ''}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Upgrade nudge for Pro users */}
                                    {isPro && !isPremium && (
                                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                                            <p className="text-xs text-slate-500">💎 Upgrade to <strong>Premium</strong> for advanced analytics: applicant status breakdown, top-performing jobs, and more.</p>
                                            <a href="/plans" className="text-xs font-bold text-indigo-600 hover:underline whitespace-nowrap">Upgrade →</a>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}

                    {/* Status Filter Tabs */}
                    <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto pb-1">
                        {['new', 'viewed', 'applied', 'dismissed'].map(status => (
                            <button
                                key={status}
                                onClick={() => {
                                    setStatusFilter(status)
                                    setPage(1)
                                }}
                                className={`px-4 py-2.5 font-semibold text-sm border-b-2 transition whitespace-nowrap ${statusFilter === status
                                    ? 'border-blue-600 text-blue-700'
                                    : 'border-transparent text-slate-600 hover:text-slate-900'
                                    }`}
                            >
                                {statusLabel(status)}
                            </button>
                        ))}
                    </div>

                    {/* Notifications List */}
                    {notifications.length === 0 ? (
                        <div className="glass-surface rounded-2xl shadow p-8 sm:p-12 text-center border border-white/80">
                            <svg className="h-16 w-16 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                {t('noStatusNotifications').replace('{{status}}', statusLabel(statusFilter).toLowerCase())}
                            </h3>
                            <p className="text-slate-600">
                                {statusFilter === 'new' ? t('notificationsEmptyNew') : t('notificationsEmptyOther')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`elevated-card interactive-rise rounded-2xl p-4 sm:p-6 cursor-pointer ${notif.status === 'new' ? 'border-l-4 border-blue-600' : ''
                                        }`}
                                    onClick={() => notif.status === 'new' && handleMarkAsViewed(notif.id)}
                                >
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 break-words">
                                                {notif.job_title}
                                            </h3>
                                            <p className="text-sm text-slate-600 mt-1">
                                                {t('fromAlert')} <span className="font-medium">{notif.alert_name}</span>
                                            </p>
                                        </div>
                                        <span className={`self-start px-3 py-1 rounded-full text-xs font-semibold ${notif.status === 'new'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : notif.status === 'viewed'
                                                ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                                : notif.status === 'applied'
                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                                            }`}>
                                            {statusLabel(notif.status)}
                                        </span>
                                    </div>

                                    {/* Job Details */}
                                    <div className="bg-slate-50 p-3 rounded-xl mb-3 text-sm border border-slate-200">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-slate-600">📍 <strong>{t('location')}:</strong></p>
                                                <p className="text-slate-900">{notif.job_location || t('notSpecified')}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-600">💰 <strong>{t('budget')}:</strong></p>
                                                <p className="text-slate-900">{notif.job_budget || t('negotiable')}</p>
                                            </div>
                                        </div>

                                        <p className="mt-2 text-slate-700">
                                            {notif.job_description?.substring(0, 150)}
                                            {notif.job_description?.length > 150 ? '...' : ''}
                                        </p>
                                    </div>

                                    {/* Client Info */}
                                    <div className="text-xs text-slate-600 mb-4">
                                        {t('postedBy')} <span className="font-medium">{notif.client_first_name} {notif.client_last_name}</span>
                                        {notif.client_rating && ` • ⭐ ${notif.client_rating}`}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Link
                                            href={`/jobs/${notif.job_id}`}
                                            className="flex-1 text-center primary-action text-white py-2 px-4 rounded-xl font-semibold transition text-sm shadow-sm"
                                        >
                                            {t('viewJobDetails')}
                                        </Link>
                                        <button
                                            onClick={() => handleDismiss(notif.id)}
                                            className="w-full sm:w-auto text-slate-600 hover:text-slate-900 px-4 py-2 border border-slate-300 rounded-xl font-semibold transition text-sm hover:bg-slate-100"
                                        >
                                            {t('dismiss')}
                                        </button>
                                    </div>

                                    {/* Timestamp */}
                                    <p className="text-xs text-slate-500 mt-3">
                                        {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-8">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-xl text-slate-700 disabled:opacity-50 hover:bg-slate-100"
                            >
                                ← {t('previous')}
                            </button>

                            <div className="flex flex-wrap justify-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`px-3 py-2 rounded-lg font-semibold transition ${page === p
                                            ? 'bg-blue-600 text-white'
                                            : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => setPage(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-xl text-slate-700 disabled:opacity-50 hover:bg-slate-100"
                            >
                                {t('next')} →
                            </button>
                        </div>
                    )}

                </>)}

                {/* ── FOLLOWERS TAB ── */}
                {notifTab === 'followers' && (
                    <div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
                            <p className="text-sm text-slate-500">
                                {followNotifications.filter(n => !n.is_read).length > 0
                                    ? `${followNotifications.filter(n => !n.is_read).length} unread`
                                    : 'All caught up'}
                            </p>
                            {followNotifications.filter(n => !n.is_read).length > 0 && (
                                <button
                                    onClick={handleMarkAllFollowRead}
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        {followLoading ? (
                            <div className="text-center py-12 text-slate-500">Loading...</div>
                        ) : followNotifications.length === 0 ? (
                            <div className="glass-surface rounded-2xl shadow p-8 sm:p-12 text-center border border-white/80">
                                <span className="text-5xl">👥</span>
                                <h3 className="text-xl font-semibold text-slate-900 mt-4 mb-2">No followers yet</h3>
                                <p className="text-slate-600">You will be notified here when someone follows you.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {followNotifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        className={`elevated-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer transition ${!notif.is_read ? 'border-l-4 border-blue-500' : ''}`}
                                        onClick={() => !notif.is_read && handleMarkFollowRead(notif.id)}
                                    >
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-xl shrink-0">
                                            👤
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm ${!notif.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-sm text-slate-600 truncate">{notif.message}</p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(notif.created_at).toLocaleDateString()} at {new Date(notif.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        {!notif.is_read && (
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                                        )}
                                        {notif.action_url && (
                                            <Link
                                                href={notif.action_url}
                                                onClick={e => e.stopPropagation()}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 whitespace-nowrap shrink-0 self-start sm:self-auto"
                                            >
                                                View Profile →
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── PROFILE VIEWS TAB ── */}
                {notifTab === 'profile_views' && (
                    <ProfileViewsTab
                        canAccess={canAccessViews}
                        subLoading={subLoading}
                        viewers={profileViewers}
                        loading={profileViewsLoading}
                        error={profileViewsError}
                        daysRange={viewsDaysRange}
                        onChangeDays={(d) => {
                            setViewsDaysRange(d)
                            fetchProfileViews(d)
                        }}
                        maxDays={isPremium ? 90 : 30}
                    />
                )}

                {/* ── PROFILE VIEWS TAB ── */}
                {notifTab === 'profile_views' && (
                    <ProfileViewsTab
                        canAccess={canAccessViews}
                        subLoading={subLoading}
                        viewers={profileViewers}
                        loading={profileViewsLoading}
                        error={profileViewsError}
                        daysRange={viewsDaysRange}
                        onChangeDays={(d) => {
                            setViewsDaysRange(d)
                            fetchProfileViews(d)
                        }}
                        maxDays={isPremium ? 90 : 30}
                    />
                )}

                {/* ── AI JOB MATCHES TAB ── */}
                {notifTab === 'ai_matches' && (
                    isPremium ? (
                        <AiJobMatchesTab
                            matches={aiMatches}
                            loading={aiMatchesLoading}
                            error={aiMatchesError}
                            appliedJobIds={appliedJobIds}
                            dismissedJobIds={dismissedJobIds}
                            applyingJobId={applyingJobId}
                            workerProfile={workerProfile}
                            onApply={handleAiApply}
                            onDismiss={handleAiDismiss}
                            onRefresh={fetchAiMatches}
                        />
                    ) : (
                        <div className="max-w-lg mx-auto text-center py-12 px-4">
                            <div className="elevated-card rounded-2xl p-8 border border-purple-100 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                                <p className="text-5xl mb-4">🤖</p>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">AI Job Matching is a Premium Feature</h3>
                                <p className="text-slate-600 text-sm mb-6">
                                    Upgrade to <strong>Premium</strong> and let our AI automatically scan all active jobs and surface the ones that best match your skills, location, and experience — ranked by fit score.
                                </p>
                                <div className="bg-white rounded-xl p-4 border border-purple-100 mb-6 text-left space-y-2">
                                    <p className="text-sm font-semibold text-slate-700 mb-1">What you get with Premium:</p>
                                    {['🤖 AI-powered job matching', '💎 Diamond badge on your profile', '🖼️ Unlimited portfolio images & videos', '⭐ Priority support channel', '📈 Top search placement'].map(f => (
                                        <p key={f} className="text-sm text-slate-600 flex items-start gap-2">{f}</p>
                                    ))}
                                </div>
                                <div className="mb-4">
                                    <p className="text-3xl font-bold text-slate-900">$9.99<span className="text-base font-normal text-slate-500">/month</span></p>
                                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">✓ Or $95.90/year · Save 20% · Cancel anytime</p>
                                </div>
                                <Link href="/pricing" className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl transition text-sm">
                                    Upgrade to Premium
                                </Link>
                            </div>
                        </div>
                    )
                )}

                {/* ── VERIFICATION BADGE TAB ── */}
                {notifTab === 'verification' && (
                    <VerificationBadgeTab
                        canRequest={canRequestVerification}
                        subLoading={subLoading}
                        badge={badge}
                        selfieFile={verifSelfieFile}
                        setSelfieFile={setVerifSelfieFile}
                        selfiePreview={verifSelfiePreview}
                        setSelfiePreview={setVerifSelfiePreview}
                        idType={verifIdType}
                        setIdType={setVerifIdType}
                        idFile={verifIdFile}
                        setIdFile={setVerifIdFile}
                        idPreview={verifIdPreview}
                        setIdPreview={setVerifIdPreview}
                        submitting={verifSubmitting}
                        setSubmitting={setVerifSubmitting}
                        submitted={verifSubmitted}
                        setSubmitted={setVerifSubmitted}
                        error={verifError}
                        setError={setVerifError}
                    />
                )}

                {/* ── SUPPORT TAB ── */}
                {notifTab === 'support' && (
                    <div className="max-w-2xl mx-auto">

                        {/* Non-premium: upgrade wall */}
                        {!isPremium ? (
                            <div className="elevated-card rounded-2xl p-8 text-center border border-indigo-100">
                                <p className="text-5xl mb-3">💎</p>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">Premium Support</h2>
                                <p className="text-slate-500 text-sm mb-6">
                                    Priority support is exclusively available to <strong>Premium members</strong>.<br />
                                    Upgrade to get dedicated 4-hour response times.
                                </p>
                                <ul className="text-left text-sm text-slate-600 space-y-2 mb-7 max-w-xs mx-auto">
                                    {['⚡ Responses within 4 hours', '💎 Dedicated support channel', '🚨 Priority queue — no waiting'].map(f => (
                                        <li key={f} className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span> {f}
                                        </li>
                                    ))}
                                </ul>
                                <a
                                    href="/pricing"
                                    className="inline-block bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition"
                                >
                                    Upgrade to Premium — $9.99/mo
                                </a>
                            </div>
                        ) : (
                            <>
                                {/* Premium: header */}
                                <div className="mb-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-lg font-bold text-slate-900">💎 Priority Support</h2>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 text-white">Premium</span>
                                    </div>
                                    <p className="text-sm text-purple-700 font-medium">⚡ As a Premium member, your requests are handled with highest priority — we aim to respond within 4 hours.</p>
                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                        {[['⚡', '4-hour response', 'Guaranteed turnaround'], ['🎯', 'Dedicated channel', 'Skip the queue'], ['📞', 'Direct contact', 'No chatbots']].map(([icon, title, sub]) => (
                                            <div key={title} className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-purple-100 rounded-xl p-2.5 text-center">
                                                <p className="text-xl">{icon}</p>
                                                <p className="text-xs font-bold text-slate-800">{title}</p>
                                                <p className="text-xs text-slate-500">{sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {supportSuccess ? (
                                    <div className="elevated-card rounded-2xl p-10 text-center border border-green-100">
                                        <p className="text-5xl mb-4">✅</p>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Message Sent!</h3>
                                        <p className="text-slate-600 mb-6">⚡ Your priority request has been received. Our team will contact you within 4 hours.</p>
                                        <button
                                            onClick={() => { setSupportSuccess(false); setSupportCategory('General'); setSupportContactMethod('email') }}
                                            className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-700 transition text-sm"
                                        >
                                            Send Another
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSupportSubmit} className="elevated-card rounded-2xl p-6 border border-white/80 space-y-5">

                                        {/* Category */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Issue Category
                                            </label>
                                            <select
                                                value={supportCategory}
                                                onChange={e => setSupportCategory(e.target.value)}
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                            >
                                                <option value="General">General Enquiry</option>
                                                <option value="Account">Account / Login Issue</option>
                                                <option value="Payment">Payment / Subscription</option>
                                                <option value="Job Posting">Job Posting Problem</option>
                                                <option value="Profile">Profile Issue</option>
                                                <option value="Messaging">Messaging / Chat</option>
                                                <option value="Bug">Bug / Technical Error</option>
                                                <option value="Safety">Safety / Abuse Report</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        {/* Message */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Describe your issue <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                value={supportMessage}
                                                onChange={e => setSupportMessage(e.target.value)}
                                                rows={6}
                                                maxLength={2000}
                                                placeholder="Please provide as much detail as possible — what happened, when it occurred, and any steps to reproduce the issue..."
                                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
                                                required
                                            />
                                            <p className="text-xs text-slate-400 mt-1 text-right">
                                                {supportMessage.length} / 2000
                                            </p>
                                        </div>

                                        {/* Contact preference */}
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                                Best way to contact you <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-2 flex-wrap mb-3">
                                                {[
                                                    { value: 'email', label: '📧 Email' },
                                                    { value: 'whatsapp', label: '💬 WhatsApp' },
                                                    { value: 'phone', label: '📞 Phone' },
                                                    { value: 'telegram', label: '✈️ Telegram' },
                                                ].map(opt => (
                                                    <button
                                                        key={opt.value}
                                                        type="button"
                                                        onClick={() => setSupportContactMethod(opt.value)}
                                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${supportContactMethod === opt.value
                                                            ? 'bg-indigo-600 border-indigo-600 text-white'
                                                            : 'bg-white border-slate-300 text-slate-600 hover:border-indigo-400'}`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={supportContactDetail}
                                                onChange={e => setSupportContactDetail(e.target.value)}
                                                placeholder={
                                                    supportContactMethod === 'email' ? 'your@email.com'
                                                        : supportContactMethod === 'whatsapp' ? '+1 234 567 8900'
                                                            : supportContactMethod === 'phone' ? '+1 234 567 8900'
                                                                : '@yourusername'
                                                }
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                                required
                                            />
                                        </div>

                                        {/* Error */}
                                        {supportError && (
                                            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                                                <p className="text-red-700 text-sm">{supportError}</p>
                                            </div>
                                        )}

                                        {/* Submit */}
                                        <button
                                            type="submit"
                                            disabled={supportSending}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
                                        >
                                            {supportSending ? (
                                                <>
                                                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                                    Sending…
                                                </>
                                            ) : (
                                                '⚡ Send Priority Request'
                                            )}
                                        </button>

                                        <p className="text-center text-xs text-slate-400">
                                            ⚡ Premium members receive responses within 4 hours.
                                        </p>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ── REFERRALS TAB ── */}
                {notifTab === 'referrals' && (
                    <div className="space-y-6">
                        {referralLoading ? (
                            <div className="elevated-card rounded-2xl p-10 text-center">
                                <span className="animate-spin inline-block w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mb-3" />
                                <p className="text-slate-500 text-sm">Loading your referral info…</p>
                            </div>
                        ) : referralError === 'not_logged_in' ? (
                            <div className="elevated-card rounded-2xl p-10 text-center border border-white/80">
                                <p className="text-4xl mb-3">🔒</p>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">Sign in to see your referrals</h3>
                                <p className="text-slate-500 text-sm mb-5">You need to be logged in to generate your referral link and track invites.</p>
                                <Link href="/login?redirect=/notifications?tab=referrals" className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
                                    Log In
                                </Link>
                            </div>
                        ) : referralError ? (
                            <div className="elevated-card rounded-2xl p-10 text-center border border-white/80">
                                <p className="text-slate-500 text-sm mb-3">{referralError}</p>
                                <button onClick={fetchReferralData} className="text-emerald-600 font-semibold text-sm underline">Try again</button>
                            </div>
                        ) : (
                            <>
                                {/* Hero card */}
                                <div className="elevated-card rounded-2xl p-6 sm:p-8 border border-white/80 bg-gradient-to-br from-emerald-50 to-white">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                        <div>
                                            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">🎁 Invite & Earn Badges</h2>
                                            <p className="text-slate-600 text-sm mt-1">Share your link. When friends sign up, you earn contributor badges displayed under your name.</p>
                                        </div>
                                        {referralData?.tier && referralData.tier.stars > 0 && (
                                            <div className="flex-shrink-0 bg-white rounded-xl px-5 py-3 shadow text-center border border-emerald-100">
                                                <p className="text-xs text-slate-500 mb-1">Your current badge</p>
                                                <ReferralBadge tier={referralData.tier} count={referralData.count} className="text-base" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Referral link */}
                                    <div className="mb-6">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Referral Link</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                                                {referralData?.referral_link ?? 'Generating…'}
                                            </div>
                                            <button
                                                onClick={handleCopyReferralLink}
                                                disabled={!referralData?.referral_link}
                                                className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition"
                                            >
                                                {referralCopied ? '✓ Copied!' : '📋 Copy'}
                                            </button>
                                        </div>
                                        {referralData?.code && (
                                            <p className="text-xs text-slate-400 mt-1.5">Your code: <span className="font-mono font-semibold text-slate-700">{referralData.code}</span></p>
                                        )}
                                    </div>

                                    {/* Share shortcuts */}
                                    <div className="flex flex-wrap gap-2">
                                        <a
                                            href={`https://wa.me/?text=${encodeURIComponent(`Join me on Go Artisans — connect workers & clients! Use my link: ${referralData?.referral_link ?? ''}`)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition"
                                        >
                                            💬 WhatsApp
                                        </a>
                                        <a
                                            href={`https://t.me/share/url?url=${encodeURIComponent(referralData?.referral_link ?? '')}&text=${encodeURIComponent('Join Go Artisans — find skilled workers near you!')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-4 py-2 rounded-full transition"
                                        >
                                            ✈️ Telegram
                                        </a>
                                        <a
                                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I'm on Go Artisans! Find skilled workers near you. Sign up with my link: ${referralData?.referral_link ?? ''}`)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full transition"
                                        >
                                            𝕏 Twitter
                                        </a>
                                        <a
                                            href={`mailto:?subject=Join Go Artisans&body=${encodeURIComponent(`Hey! I've been using Go Artisans to find skilled workers. Sign up here: ${referralData?.referral_link ?? ''}`)}`}
                                            className="flex items-center gap-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold px-4 py-2 rounded-full transition"
                                        >
                                            📧 Email
                                        </a>
                                    </div>
                                </div>

                                {/* Progress card */}
                                <div className="elevated-card rounded-2xl p-6 border border-white/80">
                                    <h3 className="text-lg font-bold text-slate-900 mb-1">Your Progress</h3>
                                    <p className="text-slate-500 text-sm mb-5">
                                        {referralData?.count ?? 0} successful referral{referralData?.count !== 1 ? 's' : ''} so far
                                        {referralData?.next_milestone ? ` — ${referralData.next_milestone - (referralData?.count ?? 0)} more to next badge` : ' — Maximum badge achieved! 🎉'}
                                    </p>

                                    {/* Progress bar */}
                                    {referralData?.next_milestone && (
                                        <div className="mb-5">
                                            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                                <span>{referralData.count ?? 0} referrals</span>
                                                <span>{referralData.next_milestone} needed</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700"
                                                    style={{ width: `${referralData?.progress_to_next ?? 0}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 text-right">{referralData?.progress_to_next ?? 0}% to next tier</p>
                                        </div>
                                    )}

                                    {/* Tier ladder */}
                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                        {[
                                            { label: 'Starter', stars: 1, min: 50, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                                            { label: 'Advocate', stars: 2, min: 150, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                                            { label: 'Promoter', stars: 3, min: 250, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                                            { label: 'Champion', stars: 4, min: 350, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                                            { label: 'Legend', stars: 5, min: 1000, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
                                        ].map(tier => {
                                            const earned = (referralData?.count ?? 0) >= tier.min
                                            return (
                                                <div key={tier.label} className={`rounded-xl p-3 border text-center transition ${earned ? `${tier.bg} ${tier.border}` : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                                                    <p className={`text-base mb-1 ${earned ? '' : 'grayscale'}`}>{'⭐'.repeat(tier.stars)}</p>
                                                    <p className={`text-xs font-bold ${earned ? tier.color : 'text-slate-400'}`}>{tier.label}</p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{tier.min}+ referrals</p>
                                                    {earned && <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ Earned</p>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* How it works */}
                                <div className="elevated-card rounded-2xl p-6 border border-white/80">
                                    <h3 className="text-lg font-bold text-slate-900 mb-4">How It Works</h3>
                                    <ol className="space-y-4">
                                        {[
                                            { step: '1', icon: '🔗', title: 'Copy your link', desc: 'Every account gets a unique referral link. Share it anywhere.' },
                                            { step: '2', icon: '📲', title: 'Friend signs up', desc: 'When someone registers using your link, they are tracked as your referral.' },
                                            { step: '3', icon: '🏅', title: 'Earn badges', desc: 'Reach 50 sign-ups for ⭐ Starter. Keep going to unlock higher tiers up to ⭐⭐⭐⭐⭐ Legend at 1,000+.' },
                                            { step: '4', icon: '👤', title: 'Badge shows on your profile', desc: 'Your earned badge is displayed under your name for everyone to see.' },
                                        ].map(item => (
                                            <li key={item.step} className="flex gap-4">
                                                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-sm font-bold text-emerald-700">
                                                    {item.step}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{item.icon} {item.title}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── SAVED WORKERS TAB ── */}
                {notifTab === 'saved_workers' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-slate-900">🔖 Saved Workers</h2>
                            {savedWorkers.length > 0 && (
                                <span className="text-xs text-slate-500">{savedWorkers.length} saved</span>
                            )}
                        </div>

                        {savedWorkersLoading ? (
                            <div className="elevated-card rounded-2xl p-10 text-center">
                                <span className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-3" />
                                <p className="text-slate-500 text-sm">Loading saved workers…</p>
                            </div>
                        ) : savedWorkers.length === 0 ? (
                            <div className="elevated-card rounded-2xl p-10 text-center border border-white/80">
                                <p className="text-4xl mb-3">🔖</p>
                                <h3 className="text-lg font-bold text-slate-900 mb-2">No saved workers yet</h3>
                                <p className="text-slate-500 text-sm mb-5">Browse workers and click the bookmark icon to save them here for quick access.</p>
                                <Link href="/browse-workers" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
                                    Browse Workers
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {savedWorkers.map(worker => (
                                    <div key={worker.id} className="elevated-card rounded-2xl p-4 border border-white/80 flex flex-col">
                                        <div className="flex items-start gap-3 mb-3">
                                            {/* Avatar */}
                                            {worker.profile_picture ? (
                                                <img
                                                    src={worker.profile_picture}
                                                    alt={`${worker.first_name} ${worker.last_name}`}
                                                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
                                                    {worker.first_name?.charAt(0)}{worker.last_name?.charAt(0)}
                                                </div>
                                            )}
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-900 truncate">{worker.first_name} {worker.last_name}</p>
                                                {worker.job_title && (
                                                    <p className="text-xs text-blue-700 font-semibold truncate">{worker.job_title}</p>
                                                )}
                                                {worker.location && (
                                                    <p className="text-xs text-slate-500 truncate">📍 {worker.location}</p>
                                                )}
                                                {worker.rating > 0 && (
                                                    <p className="text-xs text-yellow-600">⭐ {worker.rating.toFixed(1)}</p>
                                                )}
                                                <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-semibold ${worker.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    {worker.is_active ? '✓ Available' : '✗ Busy'}
                                                </span>
                                            </div>
                                        </div>

                                        {worker.bio && (
                                            <p className="text-xs text-slate-600 line-clamp-2 mb-3">{worker.bio}</p>
                                        )}

                                        <div className="mt-auto flex gap-2">
                                            <Link
                                                href={`/workers/${worker.id}`}
                                                className="flex-1 text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                                            >
                                                View Profile
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => handleUnsaveWorker(worker.id)}
                                                disabled={removingSavedId === worker.id}
                                                title="Remove from saved"
                                                className="px-2.5 py-2 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition text-xs disabled:opacity-50"
                                            >
                                                {removingSavedId === worker.id ? '…' : '🗑'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Settings Modal */}
                {showSettings && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4 z-50">
                        <NotificationPreferencesModal onClose={() => setShowSettings(false)} />
                    </div>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// AiJobMatchesTab — inline sub-component
// ─────────────────────────────────────────────────────────────
function AiJobMatchesTab({ matches, loading, error, appliedJobIds, dismissedJobIds, applyingJobId, workerProfile, onApply, onDismiss, onRefresh }) {
    const visibleMatches = matches.filter(j => !dismissedJobIds.has(j.id))

    // Check which important profile fields are missing
    const missingFields = []
    if (workerProfile) {
        if (!workerProfile.job_title?.trim()) missingFields.push({ field: 'Job Title', hint: 'Go to your profile and add a job title (e.g. "Plumber", "Graphic Designer").' })
        if (!workerProfile.bio?.trim()) missingFields.push({ field: 'Bio', hint: 'Write a short bio describing your expertise and what you offer.' })
        if (!workerProfile.location?.trim()) missingFields.push({ field: 'Location', hint: 'Add your city or region so clients can find you locally.' })
        if (!workerProfile.services?.length && !workerProfile.services?.trim?.()) missingFields.push({ field: 'Skills / Services', hint: 'List the services you provide so AI can match you to the right jobs.' })
    }

    const scoreColor = (score) => {
        if (score >= 85) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
        if (score >= 65) return 'bg-blue-100 text-blue-800 border-blue-200'
        return 'bg-amber-100 text-amber-800 border-amber-200'
    }

    const scoreLabel = (score) => {
        if (score >= 85) return '🔥 Excellent match'
        if (score >= 65) return '✅ Good match'
        return '🔶 Partial match'
    }

    const formatBudget = (b) => b ? `CFA ${b}` : 'Negotiable'
    const formatDate = (d) => {
        const diff = Math.floor((Date.now() - new Date(d)) / 86400000)
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Yesterday'
        return `${diff}d ago`
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative">
                    <div className="animate-spin h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full" />
                    <span className="absolute inset-0 flex items-center justify-center text-lg">🤖</span>
                </div>
                <p className="text-slate-600 font-medium text-sm">AI is scanning jobs for you…</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="max-w-lg mx-auto text-center py-16">
                <p className="text-5xl mb-4">⚠️</p>
                <p className="text-slate-700 font-semibold mb-2">{error}</p>
                <button onClick={onRefresh} className="mt-4 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                    Try Again
                </button>
            </div>
        )
    }

    // Profile incomplete — block and advise before anything else
    if (missingFields.length > 0) {
        return (
            <div className="max-w-xl mx-auto">
                <div className="elevated-card rounded-2xl p-8 border border-amber-200 bg-amber-50 text-center mb-6">
                    <p className="text-5xl mb-4">🛠️</p>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Complete Your Profile First</h3>
                    <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                        AI job matching works best when your profile is filled out. The following information is missing — fix it to get accurate matches.
                    </p>
                    <ul className="text-left space-y-3 mb-6">
                        {missingFields.map(({ field, hint }) => (
                            <li key={field} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-amber-100 shadow-sm">
                                <span className="text-amber-500 text-lg shrink-0">⚠️</span>
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{field}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Link
                        href="/worker-profile"
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition"
                    >
                        ✏️ Edit My Profile
                    </Link>
                </div>
            </div>
        )
    }

    if (visibleMatches.length === 0 && matches.length === 0) {
        return (
            <div className="max-w-lg mx-auto elevated-card rounded-2xl p-10 text-center border border-white/80">
                <p className="text-5xl mb-4">🤖</p>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Strong Matches Yet</h3>
                <p className="text-slate-600 mb-6">
                    Your profile looks good! There may not be open jobs matching your skills right now — check back later.
                </p>
                <button onClick={onRefresh} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                    🔄 Refresh Matches
                </button>
            </div>
        )
    }

    if (visibleMatches.length === 0) {
        return (
            <div className="max-w-lg mx-auto elevated-card rounded-2xl p-10 text-center border border-white/80">
                <p className="text-5xl mb-4">👏</p>
                <h3 className="text-xl font-bold text-slate-900 mb-2">All caught up!</h3>
                <p className="text-slate-600 mb-6">You&apos;ve applied to or dismissed all your current matches.</p>
                <button onClick={onRefresh} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition">
                    🔄 Find New Matches
                </button>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">🤖 AI Job Matches</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {visibleMatches.length} job{visibleMatches.length !== 1 ? 's' : ''} picked by AI based on your profile
                    </p>
                </div>
                <button
                    onClick={onRefresh}
                    className="self-start sm:self-auto flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-xl px-4 py-2 hover:bg-indigo-50 transition"
                >
                    🔄 Refresh
                </button>
            </div>

            <div className="space-y-4">
                {visibleMatches.map(job => {
                    const isApplied = appliedJobIds.has(job.id)
                    const isApplying = applyingJobId === job.id

                    return (
                        <div key={job.id} className="elevated-card rounded-2xl p-5 border border-slate-100 transition">
                            {/* Top row: title + score badge */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                                        {job.title}
                                    </h3>
                                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-slate-500">
                                        {job.category && <span>📂 {job.category}</span>}
                                        {job.location && <span>📍 {job.location}</span>}
                                        <span>💰 {formatBudget(job.budget)}</span>
                                        <span>🕐 {formatDate(job.created_at)}</span>
                                    </div>
                                </div>
                                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${scoreColor(job.match_score)}`}>
                                    {job.match_score}%
                                </span>
                            </div>

                            {/* AI reason */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mb-3 flex items-start gap-2">
                                <span className="text-indigo-500 shrink-0 text-sm">🤖</span>
                                <p className="text-xs text-indigo-800 leading-snug">
                                    <span className="font-semibold">{scoreLabel(job.match_score)}:</span> {job.match_reason}
                                </p>
                            </div>

                            {/* Description excerpt */}
                            {job.description && (
                                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                                    {job.description}
                                </p>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-2">
                                {isApplied ? (
                                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm font-semibold flex-1 justify-center">
                                        ✅ Applied!
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onApply(job)}
                                        disabled={isApplying}
                                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition"
                                    >
                                        {isApplying
                                            ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Applying…</>
                                            : '🚀 Apply Now'
                                        }
                                    </button>
                                )}
                                <Link
                                    href={`/jobs/${job.id}`}
                                    className="flex-1 flex items-center justify-center text-sm font-semibold text-indigo-700 border border-indigo-200 rounded-xl py-2.5 px-4 hover:bg-indigo-50 transition"
                                    target="_blank"
                                >
                                    View Full Job →
                                </Link>
                                {!isApplied && (
                                    <button
                                        onClick={() => onDismiss(job.id)}
                                        className="sm:w-auto w-full text-sm font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl py-2.5 px-4 hover:bg-slate-50 transition"
                                    >
                                        ✕ Not Interested
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// VerificationBadgeTab — inline sub-component
// ─────────────────────────────────────────────────────────────
const ID_TYPES = ['Passport', 'National ID Card', 'Driving License', 'Government-Issued ID']

function VerificationBadgeTab({
    canRequest, subLoading, badge,
    selfieFile, setSelfieFile, selfiePreview, setSelfiePreview,
    idType, setIdType, idFile, setIdFile, idPreview, setIdPreview,
    submitting, setSubmitting, submitted, setSubmitted, error, setError
}) {
    const readFileAsDataURL = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(file)
        })

    const handleSelfieChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { setError('Please upload a valid image for your selfie.'); return }
        if (file.size > 10 * 1024 * 1024) { setError('Selfie must be under 10MB.'); return }
        setSelfieFile(file)
        setSelfiePreview(await readFileAsDataURL(file))
        setError('')
    }

    const handleIdChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) { setError('Please upload a valid image for your ID.'); return }
        if (file.size > 10 * 1024 * 1024) { setError('ID image must be under 10MB.'); return }
        setIdFile(file)
        setIdPreview(await readFileAsDataURL(file))
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        if (!selfieFile) return setError('Please upload a selfie.')
        if (!idType) return setError('Please select your ID type.')
        if (!idFile) return setError('Please upload your ID document.')

        setSubmitting(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) { setError('Please log in to submit.'); setSubmitting(false); return }

            const user = session.user
            const { data: profileData } = await supabase
                .from('users')
                .select('first_name, last_name')
                .eq('id', user.id)
                .maybeSingle()

            const userName = profileData
                ? `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim()
                : user.email

            const [selfieData, idData] = await Promise.all([
                readFileAsDataURL(selfieFile),
                readFileAsDataURL(idFile),
            ])

            // Upsert pending badge record
            await supabase
                .from('verification_badges')
                .upsert({
                    user_id: user.id,
                    status: 'pending',
                    badge_type: 'identity',
                    submitted_at: new Date().toISOString(),
                }, { onConflict: 'user_id' })

            // Send via existing email route
            const res = await fetch('/api/send-verification-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, userName, userEmail: user.email, selfieData, idType, idData }),
            })
            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.error || 'Failed to submit')
            }
            setSubmitted(true)
        } catch (err) {
            console.error('[Verification Submit]', err)
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    if (subLoading) {
        return <div className="flex items-center justify-center py-16"><div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" /></div>
    }

    // Already verified
    if (badge?.status === 'approved') {
        return (
            <div className="max-w-lg mx-auto elevated-card rounded-2xl p-10 text-center border border-blue-100">
                <div className="flex justify-center mb-4"><VerifiedBadge size={72} /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">You&apos;re Verified! 🎉</h3>
                <p className="text-slate-600">Your blue badge is active on your profile. Other users can see you are a trusted member.</p>
            </div>
        )
    }

    // Pending review
    if (badge?.status === 'pending') {
        return (
            <div className="max-w-lg mx-auto elevated-card rounded-2xl p-10 text-center border border-amber-100">
                <span className="text-5xl block mb-4">⏳</span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Under Review</h3>
                <p className="text-slate-600">Your documents have been submitted and are being reviewed. You&apos;ll receive an email within <strong>24 hours</strong>.</p>
            </div>
        )
    }

    // Just submitted this session
    if (submitted) {
        return (
            <div className="max-w-lg mx-auto elevated-card rounded-2xl p-10 text-center border border-green-100">
                <div className="flex justify-center mb-4"><VerifiedBadge size={72} /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Request Submitted!</h3>
                <p className="text-slate-600 mb-2">Your selfie and ID have been sent to our verification team.</p>
                <p className="text-slate-600">If approved, a <strong>blue badge</strong> will appear on your profile within 24 hours.</p>
            </div>
        )
    }

    // Not pro/premium
    if (!canRequest) {
        return (
            <div className="max-w-lg mx-auto elevated-card rounded-2xl p-10 text-center border border-white/80">
                <div className="flex justify-center mb-4"><VerifiedBadge size={64} /></div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Pro Feature</h3>
                <p className="text-slate-600 mb-6">
                    Identity verification and the blue verified badge are available on <strong>Pro</strong> and <strong>Premium</strong> plans.
                </p>
                <Link href="/pricing" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
                    View Plans
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-start gap-4">
                <div className="shrink-0 mt-1"><VerifiedBadge size={48} /></div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Apply for Verified Badge</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Submit a selfie and a valid government ID. Our team will review within <strong>24 hours</strong>.
                        Once approved, a blue badge will appear on your profile.
                    </p>
                </div>
            </div>

            {/* What you get */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3 items-start">
                <VerifiedBadge size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">
                    Verified members build <strong>more trust</strong> with clients and workers. Your profile will show
                    a <strong>blue badge</strong> — similar to verified accounts on social platforms.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="elevated-card rounded-2xl p-6 border border-white/80 space-y-6">

                {/* Step 1 — Selfie */}
                <div>
                    <p className="text-sm font-bold text-slate-700 mb-1">Step 1 — Upload a clear selfie</p>
                    <p className="text-xs text-slate-400 mb-3">Face must be clearly visible. No sunglasses or masks.</p>
                    <label className="block cursor-pointer">
                        {selfiePreview ? (
                            <div className="relative w-32 h-32">
                                <img src={selfiePreview} alt="Selfie preview" className="w-32 h-32 rounded-xl object-cover border-2 border-blue-400" />
                                <span className="absolute top-1 right-1 bg-white rounded-full text-xs px-1.5 py-0.5 shadow text-slate-500">change</span>
                            </div>
                        ) : (
                            <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 transition">
                                <span className="text-3xl">🤳</span>
                                <span className="text-xs mt-1">Upload selfie</span>
                            </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleSelfieChange} />
                    </label>
                </div>

                {/* Step 2 — ID Type */}
                <div>
                    <p className="text-sm font-bold text-slate-700 mb-1">Step 2 — Select your ID type</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {ID_TYPES.map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setIdType(type)}
                                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${idType === type
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400'}`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Step 3 — ID Document */}
                <div>
                    <p className="text-sm font-bold text-slate-700 mb-1">Step 3 — Upload your ID document</p>
                    <p className="text-xs text-slate-400 mb-3">All four corners must be visible. Max 10MB.</p>
                    <label className="block cursor-pointer">
                        {idPreview ? (
                            <div className="relative w-48 h-32">
                                <img src={idPreview} alt="ID preview" className="w-48 h-32 rounded-xl object-cover border-2 border-blue-400" />
                                <span className="absolute top-1 right-1 bg-white rounded-full text-xs px-1.5 py-0.5 shadow text-slate-500">change</span>
                            </div>
                        ) : (
                            <div className="w-48 h-32 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-blue-400 transition">
                                <span className="text-3xl">🪪</span>
                                <span className="text-xs mt-1">Upload ID document</span>
                            </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handleIdChange} />
                    </label>
                </div>

                {/* Privacy note */}
                <p className="text-xs text-slate-400">
                    🔒 Your documents are only used for identity verification and are never shared publicly.
                </p>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Submitting…</>
                    ) : (
                        <><VerifiedBadge size={18} /> Submit Verification Request</>
                    )}
                </button>
            </form>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// ProfileViewsTab — inline sub-component
// ─────────────────────────────────────────────────────────────
function ProfileViewsTab({ canAccess, subLoading, viewers, loading, error, daysRange, onChangeDays, maxDays }) {
    if (subLoading || loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin h-8 w-8 border-b-2 border-indigo-600 rounded-full" />
            </div>
        )
    }

    if (!canAccess) {
        return (
            <div className="elevated-card rounded-2xl p-10 text-center border border-white/80">
                <p className="text-5xl mb-4">🔒</p>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Pro Feature</h3>
                <p className="text-slate-600 mb-6">
                    Upgrade to <strong>Pro</strong> to see who viewed your profile (last 30 days).<br />
                    Upgrade to <strong>Premium</strong> for the full 90-day history and deeper analytics.
                </p>
                <Link
                    href="/pricing"
                    className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
                >
                    View Plans
                </Link>
            </div>
        )
    }

    // Deduplicate viewers (most recent visit per person)
    const uniqueViewers = []
    const seenIds = new Set()
    for (const row of viewers) {
        const vid = row.viewer?.id
        if (vid && !seenIds.has(vid)) {
            seenIds.add(vid)
            uniqueViewers.push(row)
        }
    }

    // Analytics calculations
    const totalViews = viewers.length
    const uniqueCount = uniqueViewers.length
    const workerViewers = uniqueViewers.filter(r => r.viewer?.user_type === 'worker').length
    const clientViewers = uniqueViewers.filter(r => r.viewer?.user_type === 'client').length

    // Daily view counts for sparkline (last 14 days shown)
    const dailyCounts = {}
    const today = new Date()
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        dailyCounts[d.toISOString().slice(0, 10)] = 0
    }
    for (const row of viewers) {
        const key = row.view_date || row.viewed_at?.slice(0, 10)
        if (key && key in dailyCounts) dailyCounts[key]++
    }
    const dailyEntries = Object.entries(dailyCounts)
    const maxDaily = Math.max(...Object.values(dailyCounts), 1)

    const formatDate = (dateStr) => {
        if (!dateStr) return ''
        const d = new Date(dateStr)
        const now = new Date()
        const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
        if (diff === 0) return 'Today'
        if (diff === 1) return 'Yesterday'
        if (diff < 7) return `${diff} days ago`
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const dayOptions = [30, 60, 90].filter(d => d <= maxDays || d === 30)

    return (
        <div>
            {/* Header row + date range selector */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">👁️ Profile Views &amp; Engagement</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        See who visited your profile and how it&apos;s performing.
                    </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start sm:self-auto">
                    {dayOptions.map(d => (
                        <button
                            key={d}
                            onClick={() => onChangeDays(d)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${daysRange === d ? 'bg-white shadow text-indigo-700' : 'text-slate-600 hover:text-slate-900'}`}
                        >
                            {d}d
                        </button>
                    ))}
                    {maxDays < 90 && (
                        <Link
                            href="/pricing"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:text-indigo-600 transition whitespace-nowrap"
                            title="Upgrade to Premium for 90-day history"
                        >
                            90d 🔒
                        </Link>
                    )}
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <p className="text-red-700 text-sm">{error}</p>
                </div>
            )}

            {/* Analytics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-indigo-700">{totalViews}</p>
                    <p className="text-xs text-indigo-600 font-medium mt-1">Total Views</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-700">{uniqueCount}</p>
                    <p className="text-xs text-blue-600 font-medium mt-1">Unique Visitors</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-emerald-700">{clientViewers}</p>
                    <p className="text-xs text-emerald-600 font-medium mt-1">🏢 Clients</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-amber-700">{workerViewers}</p>
                    <p className="text-xs text-amber-600 font-medium mt-1">👷 Workers</p>
                </div>
            </div>

            {/* Daily Activity Sparkline (last 14 days) */}
            {totalViews > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
                    <p className="text-xs font-semibold text-slate-500 mb-3">VIEWS — LAST 14 DAYS</p>
                    <div className="flex items-end gap-1 h-12">
                        {dailyEntries.map(([date, count]) => {
                            const heightPct = count === 0 ? 4 : Math.max(10, Math.round((count / maxDaily) * 100))
                            const isToday = date === today.toISOString().slice(0, 10)
                            return (
                                <div
                                    key={date}
                                    className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
                                    title={`${date}: ${count} view${count !== 1 ? 's' : ''}`}
                                >
                                    <div
                                        className={`w-full rounded-t-sm transition-all ${isToday ? 'bg-indigo-500' : count > 0 ? 'bg-indigo-300' : 'bg-slate-100'}`}
                                        style={{ height: `${heightPct}%` }}
                                    />
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap z-10 pointer-events-none">
                                        {count} view{count !== 1 ? 's' : ''}<br />{date.slice(5)}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>{dailyEntries[0]?.[0]?.slice(5)}</span>
                        <span>Today</span>
                    </div>
                </div>
            )}

            {/* Viewers List */}
            {uniqueViewers.length === 0 ? (
                <div className="glass-surface rounded-2xl shadow p-10 text-center border border-white/80">
                    <p className="text-5xl mb-4">👀</p>
                    <p className="text-slate-500 font-medium">No profile visitors yet in the last {daysRange} days.</p>
                    <p className="text-slate-400 text-sm mt-2">Share your profile link to attract more views!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Recent Visitors ({uniqueCount})
                    </p>
                    {uniqueViewers.map((row, idx) => {
                        const v = row.viewer
                        if (!v) return null
                        const profileHref = v.user_type === 'worker' ? `/workers/${v.id}` : `/client-profile/${v.id}`
                        return (
                            <div
                                key={idx}
                                className="elevated-card rounded-xl p-4 flex items-center gap-4 border border-slate-100"
                            >
                                {/* Avatar */}
                                {v.profile_picture ? (
                                    <img
                                        src={v.profile_picture}
                                        alt={`${v.first_name} ${v.last_name}`}
                                        className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-base flex-shrink-0">
                                        {v.first_name?.charAt(0)}{v.last_name?.charAt(0)}
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">
                                        {v.first_name} {v.last_name}
                                    </p>
                                    {v.job_title && (
                                        <p className="text-xs text-indigo-600 truncate">{v.job_title}</p>
                                    )}
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {v.user_type === 'client' ? '🏢 Client' : '👷 Worker'} · {formatDate(row.viewed_at)}
                                    </p>
                                </div>

                                {/* View profile link */}
                                <Link
                                    href={profileHref}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold whitespace-nowrap shrink-0"
                                >
                                    View →
                                </Link>
                            </div>
                        )
                    })}
                </div>
            )}

            <p className="text-center text-xs text-slate-400 mt-8">
                {maxDays >= 90
                    ? 'Profile view history up to 90 days (Premium).'
                    : 'Profile view history up to 30 days. Upgrade to Premium for 90-day history.'}
            </p>
        </div>
    )
}

export default function NotificationsPage() {
    return (
        <Suspense>
            <NotificationsContent />
        </Suspense>
    )
}
