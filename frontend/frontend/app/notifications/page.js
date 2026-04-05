'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import NotificationPreferencesModal from '@/components/NotificationPreferencesModal'
import { useLanguage } from '@/context/LanguageContext'

export default function NotificationsPage() {
    const { t } = useLanguage()
    const [notifications, setNotifications] = useState([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [statusFilter, setStatusFilter] = useState('new')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [showSettings, setShowSettings] = useState(false)
    const [notifTab, setNotifTab] = useState('job_alerts') // 'job_alerts' | 'followers'
    const [followNotifications, setFollowNotifications] = useState([])
    const [followLoading, setFollowLoading] = useState(false)

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
                    </div>
                </div>

                {/* ── JOB ALERTS TAB ── */}
                {notifTab === 'job_alerts' && (<>
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
