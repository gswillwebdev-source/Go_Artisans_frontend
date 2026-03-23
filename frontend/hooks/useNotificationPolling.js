import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

let notificationUpdateCallbacks = []
const sentEmailsCache = new Set()

// Singleton notification manager
const notificationManager = {
    unreadCount: 0,
    lastCheck: null,
    registerCallback: (callback) => {
        notificationUpdateCallbacks.push(callback)
    },
    unregisterCallback: (callback) => {
        notificationUpdateCallbacks = notificationUpdateCallbacks.filter(cb => cb !== callback)
    },
    updateAll: (count) => {
        notificationManager.unreadCount = count
        notificationUpdateCallbacks.forEach(cb => cb(count))
    }
}

/**
 * useNotificationPolling Hook
 * Polls for new notifications every 30 seconds
 * Updates unread count, sends emails, and triggers callbacks
 * @returns {Object} { unreadCount, isPolling, error }
 */
export function useNotificationPolling() {
    const [unreadCount, setUnreadCount] = useState(notificationManager.unreadCount)
    const [isPolling, setIsPolling] = useState(false)
    const [error, setError] = useState(null)
    const sendingRef = useRef(false)

    const fetchUnreadCount = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Get unread count
            const { count, error: err } = await supabase
                .from('job_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('worker_id', session.user.id)
                .eq('status', 'new')

            if (err) throw err

            const countValue = count || 0

            // Update singleton and notify all listeners
            notificationManager.updateAll(countValue)
            setUnreadCount(countValue)

            // Show browser notification if we have new notifications
            if (countValue > 0 && notificationManager.lastCheck !== null && countValue > notificationManager.lastCheck) {
                showBrowserNotification(countValue - notificationManager.lastCheck)
            }

            notificationManager.lastCheck = countValue
            setError(null)

            // Send unsent emails (non-blocking)
            sendUnsentEmails(session.user.id)
        } catch (err) {
            console.error('[Poll Error]', err)
            setError(err.message)
        }
    }, [])

    const sendUnsentEmails = useCallback(async (workerId) => {
        // Prevent concurrent email sending
        if (sendingRef.current) return
        sendingRef.current = true

        try {
            const { data: unsentNotifications, error: fetchError } = await supabase
                .from('job_notifications')
                .select(`
                    id,
                    job_id,
                    notification_frequency,
                    created_at,
                    jobs (
                        id,
                        title,
                        description,
                        budget,
                        location
                    ),
                    job_alerts (
                        email_notifications
                    ),
                    workers:users!worker_id (
                        email,
                        first_name
                    )
                `)
                .eq('worker_id', workerId)
                .eq('email_sent', false)
                .limit(10)

            if (fetchError) throw fetchError

            if (!unsentNotifications || unsentNotifications.length === 0) {
                sendingRef.current = false
                return
            }

            // Send emails for each notification
            for (const notification of unsentNotifications) {
                // Skip if already sent in this session
                if (sentEmailsCache.has(notification.id)) continue

                // Skip if email notifications are disabled
                if (!notification.job_alerts?.[0]?.email_notifications) continue

                try {
                    await sendEmail({
                        notificationId: notification.id,
                        workerEmail: notification.workers?.[0]?.email,
                        workerName: notification.workers?.[0]?.first_name,
                        jobTitle: notification.jobs?.title,
                        jobDescription: notification.jobs?.description,
                        jobBudget: notification.jobs?.budget,
                        jobLocation: notification.jobs?.location,
                        jobId: notification.jobs?.id,
                        frequency: notification.notification_frequency
                    })

                    sentEmailsCache.add(notification.id)
                } catch (emailError) {
                    console.error('Email send error:', emailError)
                }
            }
        } catch (err) {
            console.error('[Send Emails Error]', err)
        } finally {
            sendingRef.current = false
        }
    }, [])

    const sendEmail = useCallback(async (emailData) => {
        const { notificationId, workerEmail, workerName, jobTitle, jobDescription, jobBudget, jobLocation, jobId, frequency } = emailData

        if (!workerEmail || !jobTitle) return

        const response = await fetch('/api/send-job-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                notification_id: notificationId,
                worker_email: workerEmail,
                worker_name: workerName,
                job_title: jobTitle,
                job_description: jobDescription,
                job_budget: jobBudget,
                job_location: jobLocation,
                job_id: jobId,
                frequency: frequency
            })
        })

        if (!response.ok) {
            throw new Error(`Failed to send email: ${response.statusText}`)
        }

        return response.json()
    }, [])

    useEffect(() => {
        // Initial fetch
        fetchUnreadCount()

        // Set up polling interval
        setIsPolling(true)
        const pollInterval = setInterval(() => {
            fetchUnreadCount()
        }, 30000) // Poll every 30 seconds

        // Register this component's callback
        const handleUpdate = (count) => setUnreadCount(count)
        notificationManager.registerCallback(handleUpdate)

        // Cleanup
        return () => {
            clearInterval(pollInterval)
            notificationManager.unregisterCallback(handleUpdate)
            setIsPolling(false)
        }
    }, [fetchUnreadCount])

    return { unreadCount, isPolling, error }
}

    useEffect(() => {
        // Initial fetch
        fetchUnreadCount()

        // Set up polling interval
        setIsPolling(true)
        const pollInterval = setInterval(() => {
            fetchUnreadCount()
        }, 30000) // Poll every 30 seconds

        // Register this component's callback
        const handleUpdate = (count) => setUnreadCount(count)
        notificationManager.registerCallback(handleUpdate)

        // Cleanup
        return () => {
            clearInterval(pollInterval)
            notificationManager.unregisterCallback(handleUpdate)
            setIsPolling(false)
        }
    }, [fetchUnreadCount])

    return { unreadCount, isPolling, error }
}

/**
 * Show browser notification
 * @param {number} newCount - Number of new notifications
 */
function showBrowserNotification(newCount) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
        console.log('[Notification] Browser does not support notifications')
        return
    }

    // Check if user has granted permission
    if (Notification.permission === 'granted') {
        new Notification('New Job Opportunities!', {
            body: `You have ${newCount} new job ${newCount === 1 ? 'alert' : 'alerts'}`,
            icon: '/logo.png', // Update with your app logo
            badge: '/logo.png',
            tag: 'job-notification',
            requireInteraction: false
        })
    } else if (Notification.permission !== 'denied') {
        // Request permission from user
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('New Job Opportunities!', {
                    body: `You have ${newCount} new job ${newCount === 1 ? 'alert' : 'alerts'}`,
                    icon: '/logo.png',
                    badge: '/logo.png',
                    tag: 'job-notification',
                    requireInteraction: false
                })
            }
        })
    }
}

/**
 * Request notification permission
 * Can be called on app startup or user action
 */
export function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('[Notification] Browser does not support notifications')
        return Promise.resolve(false)
    }

    if (Notification.permission === 'granted') {
        return Promise.resolve(true)
    }

    if (Notification.permission !== 'denied') {
        return Notification.requestPermission().then(permission => permission === 'granted')
    }

    return Promise.resolve(false)
}

/**
 * Get current unread count (for external components)
 */
export function getUnreadCount() {
    return notificationManager.unreadCount
}

export default useNotificationPolling
