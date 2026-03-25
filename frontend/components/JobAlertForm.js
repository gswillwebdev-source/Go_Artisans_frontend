'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { togoLocations, handworks } from '@/lib/togoData'
import { useLanguage } from '@/context/LanguageContext'

export default function JobAlertForm({ alert, onClose, onSuccess }) {
    const { t } = useLanguage()
    const [formData, setFormData] = useState({
        name: '',
        skills: [],
        location: '',
        min_budget: '',
        max_budget: '',
        notification_frequency: 'immediate',
        email_notifications: true,
        in_app_notifications: true
    })

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (alert) {
            setFormData({
                name: alert.name,
                skills: Array.isArray(alert.skills) ? alert.skills : [],
                location: alert.location || '',
                min_budget: alert.min_budget || '',
                max_budget: alert.max_budget || '',
                notification_frequency: alert.notification_frequency || 'immediate',
                email_notifications: alert.email_notifications !== false,
                in_app_notifications: alert.in_app_notifications !== false
            })
        }
    }, [alert])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: checked
        }))
    }

    const handleSkillAdd = (e) => {
        const selectedSkill = e.target.value
        if (selectedSkill && !formData.skills.includes(selectedSkill)) {
            setFormData(prev => ({
                ...prev,
                skills: [...prev.skills, selectedSkill]
            }))
        }
        e.target.value = ''
    }

    const handleSkillRemove = (skill) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skill)
        }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (!formData.name.trim()) {
                throw new Error(t('alertNameRequired'))
            }

            if (formData.skills.length === 0) {
                throw new Error(t('selectAtLeastOneSkill'))
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error(t('authenticationRequired'))
            }

            const alertData = {
                name: formData.name.trim(),
                skills: formData.skills,
                location: formData.location || null,
                min_budget: formData.min_budget || null,
                max_budget: formData.max_budget || null,
                notification_frequency: formData.notification_frequency,
                email_notifications: formData.email_notifications,
                in_app_notifications: formData.in_app_notifications,
                worker_id: session.user.id
            }

            if (alert) {
                const changedFields = {}
                const baseCompare = {
                    name: alertData.name,
                    skills: alertData.skills,
                    location: alertData.location,
                    min_budget: alertData.min_budget,
                    max_budget: alertData.max_budget,
                    notification_frequency: alertData.notification_frequency,
                    email_notifications: alertData.email_notifications,
                    in_app_notifications: alertData.in_app_notifications
                }

                for (const [key, nextValue] of Object.entries(baseCompare)) {
                    const currentValue = alert?.[key]
                    const isSameArray = Array.isArray(nextValue)
                        && Array.isArray(currentValue)
                        && nextValue.length === currentValue.length
                        && nextValue.every((item, idx) => item === currentValue[idx])

                    if (isSameArray || nextValue === currentValue) continue
                    changedFields[key] = nextValue
                }

                if (Object.keys(changedFields).length === 0) {
                    onSuccess()
                    return
                }

                const { error: err } = await supabase
                    .from('job_alerts')
                    .update({
                        ...changedFields,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', alert.id)

                if (err) throw err
            } else {
                // Create new alert
                const { error: err } = await supabase
                    .from('job_alerts')
                    .insert([alertData])

                if (err) throw err
            }

            onSuccess()
        } catch (err) {
            console.error('[Form Submit Error]', err)
            setError(err.message || t('failedSaveAlert'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="glass-surface rounded-3xl shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto border border-white/80">
            <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-cyan-600 text-white p-6 flex items-center justify-between z-10">
                <h2 className="profile-title text-2xl font-bold text-white">
                    {alert ? t('editJobAlertTitle') : t('createJobAlertTitle')}
                </h2>
                <button
                    onClick={onClose}
                    className="text-white hover:bg-white/20 p-1 rounded transition"
                >
                    ✕
                </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('alertNameLabel')} *
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder={t('alertNamePlaceholder')}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('skillsToMatch')} *
                    </label>
                    <p className="text-xs text-gray-600 mb-3">{t('skillsToMatchHint')}</p>

                    <div className="mb-3">
                        <select
                            onChange={handleSkillAdd}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        >
                            <option value="">-- {t('selectSkill')} --</option>
                            {handworks.map(skill => (
                                <option key={skill.value} value={skill.label}>
                                    {skill.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {formData.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {formData.skills.map(skill => (
                                <div
                                    key={skill}
                                    className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                                >
                                    {skill}
                                    <button
                                        type="button"
                                        onClick={() => handleSkillRemove(skill)}
                                        className="text-indigo-600 hover:text-indigo-800 font-bold"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">{t('noSkillsSelectedYet')}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        {t('locationOptional')}
                    </label>
                    <select
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    >
                        <option value="">-- {t('allLocationsOption')} --</option>
                        {togoLocations.map(loc => (
                            <option key={loc.value} value={loc.label}>
                                {loc.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('minBudgetOptional')}
                        </label>
                        <input
                            type="number"
                            name="min_budget"
                            value={formData.min_budget}
                            onChange={handleInputChange}
                            placeholder="e.g., 10000"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            {t('maxBudgetOptional')}
                        </label>
                        <input
                            type="number"
                            name="max_budget"
                            value={formData.max_budget}
                            onChange={handleInputChange}
                            placeholder="e.g., 50000"
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        {t('whenToGetNotified')} *
                    </label>
                    <div className="space-y-2">
                        <label className="flex items-center p-2 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="notification_frequency"
                                value="immediate"
                                checked={formData.notification_frequency === 'immediate'}
                                onChange={handleInputChange}
                                className="rounded-full"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <strong>⚡ {t('frequencyImmediate')}</strong> - {t('immediateHint')}
                            </span>
                        </label>
                        <label className="flex items-center p-2 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="notification_frequency"
                                value="daily"
                                checked={formData.notification_frequency === 'daily'}
                                onChange={handleInputChange}
                                className="rounded-full"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <strong>📅 {t('frequencyDailyDigest')}</strong> - {t('dailyHint')}
                            </span>
                        </label>
                        <label className="flex items-center p-2 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="notification_frequency"
                                value="weekly"
                                checked={formData.notification_frequency === 'weekly'}
                                onChange={handleInputChange}
                                className="rounded-full"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <strong>📬 {t('frequencyWeeklyDigest')}</strong> - {t('weeklyHint')}
                            </span>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        {t('howToGetNotified')}
                    </label>
                    <div className="space-y-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="email_notifications"
                                checked={formData.email_notifications}
                                onChange={handleCheckboxChange}
                                className="rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">📧 {t('emailNotificationsLabel')}</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="in_app_notifications"
                                checked={formData.in_app_notifications}
                                onChange={handleCheckboxChange}
                                className="rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">🔔 {t('inAppNotificationsLabel')}</span>
                        </label>
                    </div>
                </div>

                <div className="flex gap-3 justify-end sticky bottom-0 bg-white/95 backdrop-blur p-4 border-t -mx-6 -mb-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="primary-action px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 transition"
                    >
                        {loading ? t('saveAlerting') : alert ? t('updateAlert') : t('createAlert')}
                    </button>
                </div>
            </form>
        </div>
    )
}
