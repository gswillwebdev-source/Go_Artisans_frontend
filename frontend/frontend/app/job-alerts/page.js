'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import JobAlertForm from '@/components/JobAlertForm'
import { useLanguage } from '@/context/LanguageContext'

export default function JobAlertsPage() {
    const { t } = useLanguage()
    const [alerts, setAlerts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingAlert, setEditingAlert] = useState(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        fetchAlerts()
    }, [])

    const fetchAlerts = async () => {
        try {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setError(t('mustBeLoggedInViewAlerts'))
                setLoading(false)
                return
            }

            const { data, error: err } = await supabase
                .from('job_alerts')
                .select('id,name,skills,location,min_budget,max_budget,is_active,notification_frequency,email_notifications,in_app_notifications,created_at')
                .order('created_at', { ascending: false })

            if (err) throw err

            setAlerts(data || [])
            setError('')
        } catch (err) {
            console.error('[Fetch Alerts Error]', err)
            setError(t('failedLoadJobAlerts'))
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAlert = async (alertId) => {
        if (!confirm(t('confirmDeleteJobAlert'))) return

        try {
            const { error } = await supabase
                .from('job_alerts')
                .delete()
                .eq('id', alertId)

            if (error) throw error

            setAlerts(alerts.filter(a => a.id !== alertId))
            setSuccess(t('jobAlertDeletedSuccess'))
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('[Delete Alert Error]', err)
            setError(t('failedDeleteJobAlert'))
        }
    }

    const handleToggleAlert = async (alertId, currentStatus) => {
        try {
            const { data, error } = await supabase
                .from('job_alerts')
                .update({ is_active: !currentStatus })
                .eq('id', alertId)
                .select()
                .single()

            if (error) throw error

            setAlerts(alerts.map(a => a.id === alertId ? data : a))
            setSuccess(data.is_active ? t('jobAlertEnabled') : t('jobAlertDisabled'))
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('[Toggle Alert Error]', err)
            setError(t('failedSaveAlert'))
        }
    }

    const handleFormClose = () => {
        setShowForm(false)
        setEditingAlert(null)
    }

    const handleFormSuccess = () => {
        handleFormClose()
        fetchAlerts()
        setSuccess(t('jobAlertSavedSuccess'))
        setTimeout(() => setSuccess(''), 3000)
    }

    const getFrequencyLabel = (frequency) => {
        if (frequency === 'daily') return t('frequencyDailyDigest')
        if (frequency === 'weekly') return t('frequencyWeeklyDigest')
        return t('frequencyImmediate')
    }

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-container">
                    <div className="profile-section text-center py-16">
                        <p className="text-slate-600 font-semibold">{t('loadingJobAlerts')}</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="profile-page">
            <div className="profile-container space-y-6">
                <div className="profile-hero fade-in-up">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <span className="profile-chip mb-3">{t('jobAlertsCta')}</span>
                            <h1 className="profile-title text-3xl sm:text-4xl font-bold text-slate-900">{t('jobAlertsTitle')}</h1>
                            <p className="profile-muted mt-2">{t('jobAlertsSubtitle')}</p>
                        </div>
                        <div className="profile-actions">
                            <button
                                onClick={() => setShowForm(true)}
                                className="primary-action px-6 py-2.5 rounded-xl font-semibold shadow-sm"
                            >
                                + {t('createNewJobAlert')}
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="text-green-700">{success}</p>
                    </div>
                )}

                {alerts.length === 0 ? (
                    <div className="profile-section text-center py-12">
                        <svg className="h-16 w-16 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('noJobAlertsYet')}</h3>
                        <p className="text-slate-600 mb-6">{t('createFirstJobAlertDesc')}</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="primary-action px-6 py-2.5 rounded-xl font-semibold"
                        >
                            {t('createFirstJobAlert')}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className="profile-list-card hover:shadow-lg transition">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-slate-900">{alert.name}</h3>
                                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                                            {alert.skills && alert.skills.length > 0 && (
                                                <p><strong>{t('skillsLabel')}:</strong> {Array.isArray(alert.skills) ? alert.skills.join(', ') : alert.skills}</p>
                                            )}
                                            {alert.location && (
                                                <p><strong>{t('location')}:</strong> {alert.location}</p>
                                            )}
                                            {alert.min_budget || alert.max_budget ? (
                                                <p><strong>{t('budget')}:</strong> {alert.min_budget || '—'} - {alert.max_budget || t('budgetAny')}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${alert.is_active
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {alert.is_active ? t('activeStatus') : t('inactiveStatus')}
                                        </span>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-3 rounded-xl mb-4 text-sm border border-slate-200">
                                    <p className="text-slate-700">
                                        <strong>{t('frequencyLabel')}:</strong> {getFrequencyLabel(alert.notification_frequency)} {alert.email_notifications && '📧'} {alert.in_app_notifications && '🔔'}
                                    </p>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                                        className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm px-2 py-1 rounded-lg hover:bg-indigo-50"
                                    >
                                        {alert.is_active ? t('disableAlert') : t('enableAlert')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingAlert(alert)
                                            setShowForm(true)
                                        }}
                                        className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm px-2 py-1 rounded-lg hover:bg-indigo-50"
                                    >
                                        {t('editProfile')}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAlert(alert.id)}
                                        className="text-red-600 hover:text-red-700 font-semibold text-sm px-2 py-1 rounded-lg hover:bg-red-50"
                                    >
                                        {t('delete')}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="profile-section bg-blue-50/80 border border-blue-200">
                    <h4 className="text-lg font-semibold text-blue-900 mb-2">💡 {t('alertTipsTitle')}</h4>
                    <ul className="text-blue-800 space-y-2 list-disc list-inside">
                        <li>{t('alertTipOne')}</li>
                        <li>{t('alertTipTwo')}</li>
                        <li>{t('alertTipThree')}</li>
                        <li>{t('alertTipFour')}</li>
                    </ul>
                </div>

                {showForm && (
                    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <JobAlertForm
                            alert={editingAlert}
                            onClose={handleFormClose}
                            onSuccess={handleFormSuccess}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
