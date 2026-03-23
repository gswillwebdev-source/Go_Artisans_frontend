'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function NotificationPreferencesModal({ onClose }) {
    const [preferences, setPreferences] = useState(null)
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
                .select('*')
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
            setError('')
        } catch (err) {
            console.error('[Fetch Preferences Error]', err)
            setError('Failed to load preferences')
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

            const { error: err } = await supabase
                .from('notification_preferences')
                .update({
                    email_job_alerts: preferences.email_job_alerts,
                    in_app_job_alerts: preferences.in_app_job_alerts,
                    email_frequency: preferences.email_frequency,
                    digest_day_of_week: preferences.digest_day_of_week,
                    digest_time_preference: preferences.digest_time_preference,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', (await supabase.auth.getSession()).data.session.user.id)

            if (err) throw err

            setSuccess('Preferences saved successfully')
            setTimeout(() => {
                setSuccess('')
                onClose()
            }, 2000)
        } catch (err) {
            console.error('[Save Preferences Error]', err)
            setError('Failed to save preferences')
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow-xl p-6 text-center">
                <p>Loading preferences...</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Notification Preferences</h2>
                <button
                    onClick={onClose}
                    className="text-white hover:bg-indigo-700 p-1 rounded transition"
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
                                <span className="ml-3 text-sm font-semibold text-gray-700">📧 Email Job Alerts</span>
                            </label>
                            <p className="text-xs text-gray-600 ml-6">
                                Receive job notifications via email
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
                                <span className="ml-3 text-sm font-semibold text-gray-700">🔔 In-App Notifications</span>
                            </label>
                            <p className="text-xs text-gray-600 ml-6">
                                See notification badge and alerts in the app
                            </p>
                        </div>

                        {/* Default Frequency */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Default Notification Frequency
                            </label>
                            <select
                                value={preferences.email_frequency}
                                onChange={(e) => handleChange('email_frequency', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                            >
                                <option value="immediate">⚡ Immediate</option>
                                <option value="daily">📅 Daily Digest</option>
                                <option value="weekly">📬 Weekly Digest</option>
                            </select>
                            <p className="text-xs text-gray-600 mt-1">
                                Default for new alerts (can override per alert)
                            </p>
                        </div>

                        {/* Digest Timing */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Digest Email Time
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-gray-600">Day</label>
                                    <select
                                        value={preferences.digest_day_of_week}
                                        onChange={(e) => handleChange('digest_day_of_week', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
                                    >
                                        <option value="monday">Monday</option>
                                        <option value="tuesday">Tuesday</option>
                                        <option value="wednesday">Wednesday</option>
                                        <option value="thursday">Thursday</option>
                                        <option value="friday">Friday</option>
                                        <option value="saturday">Saturday</option>
                                        <option value="sunday">Sunday</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-600">Time (UTC)</label>
                                    <input
                                        type="time"
                                        value={preferences.digest_time_preference}
                                        onChange={(e) => handleChange('digest_time_preference', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 p-3 rounded text-xs text-blue-700">
                            💡 You can override these defaults when creating or editing individual job alerts
                        </div>
                    </>
                )}

                {/* Buttons */}
                <div className="flex gap-3 justify-end border-t pt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        {saving ? 'Saving...' : 'Save Preferences'}
                    </button>
                </div>
            </div>
        </div>
    )
}
