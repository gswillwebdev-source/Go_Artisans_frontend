import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

let notificationUpdateCallbacks = []
const sentEmailsCache = new Set()
let emailEndpointUnavailable = false

function isOffline() {
    return typeof navigator !== 'undefined' && navigator.onLine === false
}

function isLikelyNetworkError(err) {
    const message = String(err?.message || '')
    return (
        err?.name === 'TypeError'
        || /Failed to fetch/i.test(message)
        || /NetworkError/i.test(message)
        || /ERR_INTERNET_DISCONNECTED/i.test(message)
    )
}

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
    const pollingRef = useRef(false)

    const fetchUnreadCount = useCallback(async () => {
        if (pollingRef.current) return
        if (isOffline()) {
            setError(null)
            return
        }

        pollingRef.current = true
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            // Count unread job alert notifications
            const { count: jobCount, error: jobErr } = await supabase
                .from('job_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('worker_id', session.user.id)
                .eq('status', 'new')

            if (jobErr) throw jobErr

            // Count unread follow/general notifications (non-fatal if table missing)
            const { count: followCount } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', session.user.id)
                .eq('is_read', false)

            const countValue = (jobCount || 0) + (followCount || 0)

            // Show browser notification if count increased
            if (countValue > 0 && notificationManager.lastCheck !== null && countValue > notificationManager.lastCheck) {
                showBrowserNotification(countValue - notificationManager.lastCheck)
            }

            notificationManager.lastCheck = countValue
            notificationManager.updateAll(countValue)
            setUnreadCount(countValue)
            setError(null)

            // Send unsent job notification emails (non-blocking)
            sendUnsentEmails(session.user.id)
        } catch (err) {
            if (!isLikelyNetworkError(err)) {
                console.error('[Poll Error]', err)
            }
            setError(err?.message || null)
        } finally {
            pollingRef.current = false
        }
    }, [])

    const sendUnsentEmails = useCallback(async (workerId) => {
        // Prevent concurrent email sending
        if (sendingRef.current || emailEndpointUnavailable || isOffline()) return
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
            if (!isLikelyNetworkError(err)) {
                console.error('[Send Emails Error]', err)
            }
        } finally {
            sendingRef.current = false
        }
    }, [])

    const sendEmail = useCallback(async (emailData) => {
        const { notificationId, workerEmail, workerName, jobTitle, jobDescription, jobBudget, jobLocation, jobId, frequency } = emailData

        if (!workerEmail || !jobTitle) return
        if (emailEndpointUnavailable || isOffline()) return

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
            if (response.status === 404) {
                emailEndpointUnavailable = true
                return
            }
            throw new Error(`Failed to send email: ${response.statusText}`)
        }

        return response.json()
    }, [])

    useEffect(() => {
        let isMounted = true
        const channels = []

        const setupRealtime = async () => {
            if (isOffline()) return

            const { data: { session } } = await supabase.auth.getSession()
            if (!session || !isMounted) return
            const userId = session.user.id

            // Real-time: new job alert notifications
            const jobChannel = supabase
                .channel(`job-notifs-rt-${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'job_notifications',
                    filter: `worker_id=eq.${userId}`
                }, () => { if (isMounted) fetchUnreadCount() })
                .subscribe()

            // Real-time: new follower / general notifications
            const notifChannel = supabase
                .channel(`user-notifs-rt-${userId}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, () => { if (isMounted) fetchUnreadCount() })
                .subscribe()

            channels.push(jobChannel, notifChannel)
        }

        // Initial fetch
        fetchUnreadCount()
        setIsPolling(true)
        setupRealtime()

        const handleOnline = () => {
            if (!isMounted) return
            fetchUnreadCount()
            setupRealtime()
        }
        window.addEventListener('online', handleOnline)

        // Polling as 30-second fallback
        const pollInterval = setInterval(fetchUnreadCount, 30000)

        // Register this component's callback
        const handleUpdate = (count) => { if (isMounted) setUnreadCount(count) }
        notificationManager.registerCallback(handleUpdate)

        return () => {
            isMounted = false
            clearInterval(pollInterval)
            window.removeEventListener('online', handleOnline)
            notificationManager.unregisterCallback(handleUpdate)
            channels.forEach(ch => supabase.removeChannel(ch))
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
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            tag: 'job-notification',
            requireInteraction: false
        })
    } else if (Notification.permission !== 'denied') {
        // Request permission from user
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('New Job Opportunities!', {
                    body: `You have ${newCount} new job ${newCount === 1 ? 'alert' : 'alerts'}`,
                    icon: '/favicon.svg',
                    badge: '/favicon.svg',
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
