'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import JobAlertForm from '@/components/JobAlertForm'
import Link from 'next/link'

export default function JobAlertsPage() {
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
                setError('You must be logged in to view your alerts')
                setLoading(false)
                return
            }

            const { data, error: err } = await supabase
                .from('job_alerts')
                .select('*')
                .order('created_at', { ascending: false })

            if (err) throw err

            setAlerts(data || [])
            setError('')
        } catch (err) {
            console.error('[Fetch Alerts Error]', err)
            setError('Failed to load your job alerts')
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteAlert = async (alertId) => {
        if (!confirm('Are you sure you want to delete this alert?')) return

        try {
            const { error } = await supabase
                .from('job_alerts')
                .delete()
                .eq('id', alertId)

            if (error) throw error

            setAlerts(alerts.filter(a => a.id !== alertId))
            setSuccess('Alert deleted successfully')
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('[Delete Alert Error]', err)
            setError('Failed to delete alert')
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
            setSuccess(`Alert ${data.is_active ? 'enabled' : 'disabled'}`)
            setTimeout(() => setSuccess(''), 3000)
        } catch (err) {
            console.error('[Toggle Alert Error]', err)
            setError('Failed to toggle alert')
        }
    }

    const handleFormClose = () => {
        setShowForm(false)
        setEditingAlert(null)
    }

    const handleFormSuccess = () => {
        handleFormClose()
        fetchAlerts()
        setSuccess('Alert saved successfully')
        setTimeout(() => setSuccess(''), 3000)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center py-12">
                        <p className="text-gray-600">Loading your job alerts...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Job Alerts</h1>
                    <p className="text-gray-600">Automatically get notified when new jobs match your skills</p>
                </div>

                {/* Messages */}
                {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}
                {success && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6 rounded">
                        <p className="text-green-700">{success}</p>
                    </div>
                )}

                {/* Action Button */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowForm(true)}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                    >
                        + Create New Alert
                    </button>
                </div>

                {/* Alerts List */}
                {alerts.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No job alerts yet</h3>
                        <p className="text-gray-600 mb-6">Create your first job alert to get notified about opportunities</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition"
                        >
                            Create Your First Alert
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">{alert.name}</h3>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            {alert.skills && alert.skills.length > 0 && (
                                                <p><strong>Skills:</strong> {Array.isArray(alert.skills) ? alert.skills.join(', ') : alert.skills}</p>
                                            )}
                                            {alert.location && (
                                                <p><strong>Location:</strong> {alert.location}</p>
                                            )}
                                            {alert.min_budget || alert.max_budget ? (
                                                <p><strong>Budget:</strong> {alert.min_budget || '—'} - {alert.max_budget || 'Any'}</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${alert.is_active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {alert.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                {/* Notification Settings */}
                                <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
                                    <p className="text-gray-700">
                                        <strong>Frequency:</strong> {alert.notification_frequency.charAt(0).toUpperCase() + alert.notification_frequency.slice(1)} {alert.email_notifications && '📧'} {alert.in_app_notifications && '🔔'}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                                        className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                                    >
                                        {alert.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingAlert(alert)
                                            setShowForm(true)
                                        }}
                                        className="text-indigo-600 hover:text-indigo-700 font-semibold text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteAlert(alert.id)}
                                        className="text-red-600 hover:text-red-700 font-semibold text-sm"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Help Section */}
                <div className="mt-12 bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
                    <h4 className="text-lg font-semibold text-blue-900 mb-2">💡 Tips for Creating Alerts</h4>
                    <ul className="text-blue-700 space-y-2 list-disc list-inside">
                        <li>Use clear skill names that match job titles (e.g., "plumbing", "electrical work")</li>
                        <li>Add your location to find nearby jobs</li>
                        <li>Set budget ranges to filter opportunities</li>
                        <li>Choose "immediate" for urgent notifications, or "daily"/"weekly" for digests</li>
                    </ul>
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
