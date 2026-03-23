'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { togoLocations, handworks } from '@/lib/togoData'

export default function JobAlertForm({ alert, onClose, onSuccess }) {
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
                throw new Error('Alert name is required')
            }

            if (formData.skills.length === 0) {
                throw new Error('Please select at least one skill')
            }

            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                throw new Error('Authentication required')
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
                // Update existing alert
                const { error: err } = await supabase
                    .from('job_alerts')
                    .update({
                        ...alertData,
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
            setError(err.message || 'Failed to save alert')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-indigo-600 text-white p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold">
                    {alert ? 'Edit Job Alert' : 'Create New Job Alert'}
                </h2>
                <button
                    onClick={onClose}
                    className="text-white hover:bg-indigo-700 p-1 rounded transition"
                >
                    ✕
                </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Alert Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Alert Name *
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Web Design Jobs in Lome"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    />
                </div>

                {/* Skills/Services - Dropdown */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Skills to Match *
                    </label>
                    <p className="text-xs text-gray-600 mb-3">Select handwork skills to match with notifications</p>

                    {/* Dropdown */}
                    <div className="mb-3">
                        <select
                            onChange={handleSkillAdd}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        >
                            <option value="">-- Select a skill --</option>
                            {handworks.map(skill => (
                                <option key={skill.value} value={skill.label}>
                                    {skill.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Selected Skills Tags */}
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
                        <p className="text-sm text-gray-500 italic">No skills selected yet</p>
                    )}
                </div>

                {/* Location - Dropdown with Togo Cities */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Location (Optional)
                    </label>
                    <select
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                    >
                        <option value="">-- All Locations --</option>
                        {togoLocations.map(loc => (
                            <option key={loc.value} value={loc.label}>
                                {loc.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Budget Range */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Min Budget (Optional)
                        </label>
                        <input
                            type="number"
                            name="min_budget"
                            value={formData.min_budget}
                            onChange={handleInputChange}
                            placeholder="e.g., 10000"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Max Budget (Optional)
                        </label>
                        <input
                            type="number"
                            name="max_budget"
                            value={formData.max_budget}
                            onChange={handleInputChange}
                            placeholder="e.g., 50000"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Notification Frequency */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        When to Get Notified *
                    </label>
                    <div className="space-y-2">
                        <label className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="notification_frequency"
                                value="immediate"
                                checked={formData.notification_frequency === 'immediate'}
                                onChange={handleInputChange}
                                className="rounded-full"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <strong>⚡ Immediate</strong> - Get notified right away when a job matches
                            </span>
                        </label>
                        <label className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="notification_frequency"
                                value="daily"
                                checked={formData.notification_frequency === 'daily'}
                                onChange={handleInputChange}
                                className="rounded-full"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <strong>📅 Daily</strong> - Get a digest email each morning at 8 AM
                            </span>
                        </label>
                        <label className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                                type="radio"
                                name="notification_frequency"
                                value="weekly"
                                checked={formData.notification_frequency === 'weekly'}
                                onChange={handleInputChange}
                                className="rounded-full"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                                <strong>📬 Weekly</strong> - Get a digest email every Monday at 8 AM
                            </span>
                        </label>
                    </div>
                </div>

                {/* Notification Channels */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        How to Get Notified
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
                            <span className="ml-2 text-sm text-gray-700">📧 Email notifications</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                name="in_app_notifications"
                                checked={formData.in_app_notifications}
                                onChange={handleCheckboxChange}
                                className="rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">🔔 In-app notifications</span>
                        </label>
                    </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end sticky bottom-0 bg-gray-50 p-4 border-t -mx-6 -mb-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                        {loading ? 'Saving...' : alert ? 'Update Alert' : 'Create Alert'}
                    </button>
                </div>
            </form>
        </div>
    )
}
