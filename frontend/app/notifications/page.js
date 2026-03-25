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
    const [showPreferences, setShowPreferences] = useState(false)

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

        // Poll for new notifications every 30 seconds
        const pollInterval = setInterval(() => {
            fetchUnreadCount()
        }, 30000)

        return () => clearInterval(pollInterval)
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
        <div className="min-h-screen p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 fade-in-up">
                    <div>
                        <h1 className="display-font text-4xl font-bold text-slate-900 tracking-tight">{t('notificationsTitle')}</h1>
                        {unreadCount > 0 && (
                            <p className="text-slate-600 mt-2">
                                {t('youHaveNewNotifications').replace('{{count}}', unreadCount)}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowPreferences(true)}
                        className="text-slate-600 hover:text-slate-900 font-semibold text-sm flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 border border-transparent"
                    >
                        ⚙️ {t('preferences')}
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
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
                    <div className="glass-surface rounded-2xl shadow p-12 text-center border border-white/80">
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
                                className={`elevated-card interactive-rise rounded-2xl p-6 cursor-pointer ${notif.status === 'new' ? 'border-l-4 border-blue-600' : ''
                                    }`}
                                onClick={() => notif.status === 'new' && handleMarkAsViewed(notif.id)}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            {notif.job_title}
                                        </h3>
                                        <p className="text-sm text-slate-600 mt-1">
                                            {t('fromAlert')} <span className="font-medium">{notif.alert_name}</span>
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${notif.status === 'new'
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
                                    <div className="grid grid-cols-2 gap-2">
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
                                <div className="flex gap-3">
                                    <Link
                                        href={`/jobs/${notif.job_id}`}
                                        className="flex-1 text-center primary-action text-white py-2 px-4 rounded-xl font-semibold transition text-sm shadow-sm"
                                    >
                                        {t('viewJobDetails')}
                                    </Link>
                                    <button
                                        onClick={() => handleDismiss(notif.id)}
                                        className="text-slate-600 hover:text-slate-900 px-4 py-2 border border-slate-300 rounded-xl font-semibold transition text-sm hover:bg-slate-100"
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
                    <div className="flex items-center justify-center gap-2 mt-8">
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-3 py-2 border border-slate-300 rounded-xl text-slate-700 disabled:opacity-50 hover:bg-slate-100"
                        >
                            ← {t('previous')}
                        </button>

                        <div className="flex gap-1">
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
                            className="px-3 py-2 border border-slate-300 rounded-xl text-slate-700 disabled:opacity-50 hover:bg-slate-100"
                        >
                            {t('next')} →
                        </button>
                    </div>
                )}

                {/* Preferences Modal */}
                {showPreferences && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <NotificationPreferencesModal onClose={() => setShowPreferences(false)} />
                    </div>
                )}
            </div>
        </div>
    )
}
