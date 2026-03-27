'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'

function createDefaultPreferences(userId = null) {
    return {
        id: null,
        user_id: userId,
        email_job_alerts: true,
        in_app_job_alerts: true,
        email_frequency: 'immediate',
        digest_day_of_week: 'monday',
        digest_time_preference: '08:00',
        updated_at: null
    }
}

function isAuthSessionMissing(err) {
    return err?.name === 'AuthSessionMissingError' || err?.message?.toLowerCase?.().includes('auth session missing')
}

export default function NotificationPreferencesModal({ onClose }) {
    const { t } = useLanguage()
    const router = useRouter()
    const { theme, setTheme } = useTheme()
    const [preferences, setPreferences] = useState(null)
    const [initialPreferences, setInitialPreferences] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [showSwitchPrompt, setShowSwitchPrompt] = useState(false)

    useEffect(() => {
        fetchPreferences()
    }, [])

    const fetchPreferences = async () => {
        try {
            setLoading(true)
            const { data: { session }, error: authError } = await supabase.auth.getSession()

            if (authError) {
                throw authError
            }

            if (!session?.user) {
                const defaults = createDefaultPreferences()
                setPreferences(defaults)
                setInitialPreferences(defaults)
                setError('')
                return
            }

            const user = session.user

            let { data, error: err } = await supabase
                .from('notification_preferences')
                .select('id,user_id,email_job_alerts,in_app_job_alerts,email_frequency,digest_day_of_week,digest_time_preference,updated_at')
                .eq('user_id', user.id)
                .maybeSingle()

            if (err) {
                throw err
            }

            const resolvedPreferences = {
                ...createDefaultPreferences(user.id),
                ...(data || {})
            }

            setPreferences(resolvedPreferences)
            setInitialPreferences(resolvedPreferences)
            setError('')
        } catch (err) {
            if (!isAuthSessionMissing(err)) {
                console.error('[Fetch Preferences Error]', err)
            }
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
            setError('')

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
                setSuccess(t('settingsSavedSuccess'))
                setTimeout(() => {
                    setSuccess('')
                    onClose()
                }, 2000)
                return
            }

            const { data: { session }, error: authError } = await supabase.auth.getSession()
            if (authError || !session?.user) throw authError || new Error('Not authenticated')
            const user = session.user

            const { data: savedPreferences, error: err } = await supabase
                .from('notification_preferences')
                .upsert({
                    user_id: user.id,
                    ...changedPayload,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' })
                .select('id,user_id,email_job_alerts,in_app_job_alerts,email_frequency,digest_day_of_week,digest_time_preference,updated_at')
                .single()

            if (err) throw err

            const resolvedPreferences = {
                ...createDefaultPreferences(user.id),
                ...(savedPreferences || {}),
                ...changedPayload
            }

            setPreferences(resolvedPreferences)
            setInitialPreferences(resolvedPreferences)

            setSuccess(t('settingsSavedSuccess'))
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

    const handleSwitchAccount = async (destination) => {
        try {
            await supabase.auth.signOut()

            if (typeof window !== 'undefined') {
                localStorage.setItem('explicitLogout', '1')
                localStorage.removeItem('token')
                localStorage.removeItem('user')
                localStorage.removeItem('adminToken')
                localStorage.removeItem('adminUser')
            }

            onClose()
            router.push(destination)
        } catch (err) {
            console.error('[Switch Account Error]', err)
            setError(t('failedSwitchAccount'))
        }
    }

    if (loading) {
        return (
            <div className="glass-surface w-full max-w-md rounded-2xl shadow-xl p-5 sm:p-6 text-center border border-white/80">
                <p className="text-slate-600 font-semibold">{t('loadingSettings')}</p>
            </div>
        )
    }

    return (
        <div className="glass-surface flex max-h-[min(92vh,860px)] w-full max-w-2xl flex-col rounded-2xl shadow-xl border border-white/80 overflow-hidden overscroll-contain">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 flex items-start sm:items-center justify-between gap-3">
                <h2 className="display-font text-lg sm:text-xl font-bold tracking-tight leading-tight">{t('settings')}</h2>
                <button
                    onClick={onClose}
                    className="shrink-0 text-white hover:bg-blue-800 p-2 rounded-lg transition"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
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
                        <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">{t('appearance')}</h3>
                                <p className="text-xs text-slate-600 mt-1">{t('appearanceHint')}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                                <button
                                    type="button"
                                    onClick={() => setTheme('light')}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${theme === 'light' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    {t('lightMode')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTheme('dark')}
                                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${theme === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    {t('darkMode')}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">{t('account')}</h3>
                                <p className="text-xs text-slate-600 mt-1">{t('switchAccountHint')}</p>
                            </div>

                            {!showSwitchPrompt ? (
                                <button
                                    type="button"
                                    onClick={() => setShowSwitchPrompt(true)}
                                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                                >
                                    {t('switchAccount')}
                                </button>
                            ) : (
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
                                    <p className="text-sm text-slate-700">{t('switchAccountPrompt')}</p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchAccount('/login')}
                                            className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                                        >
                                            {t('login')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSwitchAccount('/register')}
                                            className="flex-1 rounded-xl primary-action px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
                                        >
                                            {t('register')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Email Notifications */}
                        <div className="rounded-2xl border border-slate-200 p-4 space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">{t('notificationSettings')}</h3>
                                <p className="text-xs text-slate-600 mt-1">{t('notificationSettingsHint')}</p>
                            </div>

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


                            {/* In-App Notifications */}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                            <div className="bg-blue-50 p-3 rounded text-xs text-blue-700 leading-relaxed break-words">
                                💡 {t('preferenceOverrideHint')}
                            </div>
                        </div>
                    </>
                )}

                {/* Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end border-t pt-5 sm:pt-6 sticky bottom-0 bg-inherit">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-100 transition"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full sm:w-auto px-4 py-2 primary-action text-white rounded-xl font-semibold disabled:opacity-50 transition shadow-sm"
                    >
                        {saving ? t('saving') : t('saveSettings')}
                    </button>
                </div>
            </div>
        </div>
    )
}
