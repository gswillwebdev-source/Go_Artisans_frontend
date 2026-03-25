'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'

export default function NotificationPreferencesModal({ onClose }) {
    const { t } = useLanguage()
    const [preferences, setPreferences] = useState(null)
    const [initialPreferences, setInitialPreferences] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    useEffect(() => {
        fetchPreferences()
    }, [])

    const fetchPreferences = async () => {
        try {
            setLoading(true)

            // Try to get existing preferences or create defaults
            let { data, error: err } = await supabase
                .from('notification_preferences')
                .select('id,user_id,email_job_alerts,in_app_job_alerts,email_frequency,digest_day_of_week,digest_time_preference,updated_at')
                .single()

            if (err && err.code === 'PGRST116') {
                // Not found, create new preferences
                const { data: newPrefs, error: createErr } = await supabase
                    .from('notification_preferences')
                    .insert([{}])
                    .select()
                    .single()

                if (createErr) throw createErr
                data = newPrefs
            } else if (err) {
                throw err
            }

            setPreferences(data)
            setInitialPreferences(data)
            setError('')
        } catch (err) {
            console.error('[Fetch Preferences Error]', err)
            setError(t('failedLoadPreferences'))
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (field, value) => {
        setPreferences(prev => ({
            ...prev,
            [field]: value
        }))
    }

    const handleSave = async () => {
        try {
            setSaving(true)

            const nextPayload = {
                email_job_alerts: preferences.email_job_alerts,
                in_app_job_alerts: preferences.in_app_job_alerts,
                email_frequency: preferences.email_frequency,
                digest_day_of_week: preferences.digest_day_of_week,
                digest_time_preference: preferences.digest_time_preference
            }

            const changedPayload = {}
            for (const [key, nextValue] of Object.entries(nextPayload)) {
                if (nextValue === initialPreferences?.[key]) continue
                changedPayload[key] = nextValue
            }

            if (Object.keys(changedPayload).length === 0) {
                setSuccess(t('preferencesSavedSuccess'))
                setTimeout(() => {
                    setSuccess('')
                    onClose()
                }, 2000)
                return
            }

            const { error: err } = await supabase
                .from('notification_preferences')
                .update({
                    ...changedPayload,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', (await supabase.auth.getSession()).data.session.user.id)

            if (err) throw err

            setInitialPreferences(prev => ({
                ...(prev || {}),
                ...changedPayload
            }))

            setSuccess(t('preferencesSavedSuccess'))
            setTimeout(() => {
                setSuccess('')
                onClose()
            }, 2000)
        } catch (err) {
            console.error('[Save Preferences Error]', err)
            setError(t('failedSavePreferences'))
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="glass-surface rounded-2xl shadow-xl p-6 text-center border border-white/80">
                <p className="text-slate-600 font-semibold">{t('loadingPreferences')}</p>
            </div>
        )
    }

    return (
        <div className="glass-surface rounded-2xl shadow-xl max-w-md w-full border border-white/80 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
                <h2 className="display-font text-xl font-bold tracking-tight">{t('notificationPreferences')}</h2>
                <button
                    onClick={onClose}
                    className="text-white hover:bg-blue-800 p-1 rounded transition"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-3 rounded text-sm text-green-700">
                        {success}
                    </div>
                )}

                {preferences && (
                    <>
                        {/* Email Notifications */}
                        <div>
                            <label className="flex items-center cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={preferences.email_job_alerts}
                                    onChange={(e) => handleChange('email_job_alerts', e.target.checked)}
                                    className="rounded"
                                />
                                <span className="ml-3 text-sm font-semibold text-slate-700">📧 {t('emailJobAlerts')}</span>
                            </label>
                            <p className="text-xs text-slate-600 ml-6">
                                {t('emailJobAlertsHint')}
                            </p>
                        </div>

                        {/* In-App Notifications */}
                        <div>
                            <label className="flex items-center cursor-pointer mb-2">
                                <input
                                    type="checkbox"
                                    checked={preferences.in_app_job_alerts}
                                    onChange={(e) => handleChange('in_app_job_alerts', e.target.checked)}
                                    className="rounded"
                                />
                                <span className="ml-3 text-sm font-semibold text-slate-700">🔔 {t('inAppNotifications')}</span>
                            </label>
                            <p className="text-xs text-slate-600 ml-6">
                                {t('inAppNotificationsHint')}
                            </p>
                        </div>

                        {/* Default Frequency */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                {t('defaultNotificationFrequency')}
                            </label>
                            <select
                                value={preferences.email_frequency}
                                onChange={(e) => handleChange('email_frequency', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="immediate">⚡ {t('frequencyImmediate')}</option>
                                <option value="daily">📅 {t('frequencyDailyDigest')}</option>
                                <option value="weekly">📬 {t('frequencyWeeklyDigest')}</option>
                            </select>
                            <p className="text-xs text-slate-600 mt-1">
                                {t('defaultNotificationFrequencyHint')}
                            </p>
                        </div>

                        {/* Digest Timing */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                {t('digestEmailTime')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-600">{t('day')}</label>
                                    <select
                                        value={preferences.digest_day_of_week}
                                        onChange={(e) => handleChange('digest_day_of_week', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    >
                                        <option value="monday">{t('monday')}</option>
                                        <option value="tuesday">{t('tuesday')}</option>
                                        <option value="wednesday">{t('wednesday')}</option>
                                        <option value="thursday">{t('thursday')}</option>
                                        <option value="friday">{t('friday')}</option>
                                        <option value="saturday">{t('saturday')}</option>
                                        <option value="sunday">{t('sunday')}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-slate-600">{t('timeUtc')}</label>
                                    <input
                                        type="time"
                                        value={preferences.digest_time_preference}
                                        onChange={(e) => handleChange('digest_time_preference', e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/90 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                            💡 {t('preferenceOverrideHint')}
                        </div>
                    </>
                )}

                {/* Buttons */}
                <div className="flex gap-3 justify-end border-t pt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 transition"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 primary-action text-white rounded-xl font-semibold disabled:opacity-50 transition shadow-sm"
                    >
                        {saving ? t('saving') : t('savePreferences')}
                    </button>
                </div>
            </div>
        </div>
    )
}
