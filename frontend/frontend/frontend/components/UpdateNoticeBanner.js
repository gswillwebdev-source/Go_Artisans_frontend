'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const POLL_INTERVAL_MS = 30000

function isMissingUpdateNoticeRpc(error) {
    const code = String(error?.code || '')
    const message = String(error?.message || '')
    const details = String(error?.details || '')
    const hint = String(error?.hint || '')

    return (
        Number(error?.status) === 404
        || /PGRST202/i.test(code)
        || /get_active_update_notice/i.test(message + details + hint)
        && /does not exist|not found|schema cache/i.test(message + details + hint)
    )
}

function toReadableDate(value) {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toLocaleString()
}

export default function UpdateNoticeBanner() {
    const [notice, setNotice] = useState(null)
    const [dismissed, setDismissed] = useState(false)
    const [notificationPermission, setNotificationPermission] = useState('default')
    const notifiedVersionRef = useRef('')
    const noticePollingEnabledRef = useRef(true)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setNotificationPermission(Notification.permission)
        }
    }, [])

    const noticeVersion = useMemo(() => {
        if (!notice) return ''
        return `${notice.updated_at || ''}:${notice.message || ''}:${notice.starts_at || ''}`
    }, [notice])

    useEffect(() => {
        if (!noticeVersion || typeof window === 'undefined') return
        const key = 'dismissed_update_notice_version'
        const dismissedVersion = localStorage.getItem(key) || ''
        setDismissed(dismissedVersion === noticeVersion)
    }, [noticeVersion])

    useEffect(() => {
        let isMounted = true
        let intervalId

        const disablePolling = () => {
            noticePollingEnabledRef.current = false
            if (intervalId) clearInterval(intervalId)
        }

        const fetchActiveNotice = async () => {
            if (!noticePollingEnabledRef.current) return

            const { data, error } = await supabase.rpc('get_active_update_notice')

            if (!isMounted) return

            if (error) {
                if (isMissingUpdateNoticeRpc(error)) {
                    // Disable repeated polling when migration/RPC is missing.
                    setNotice(null)
                    disablePolling()
                    return
                }

                // Keep UI quiet when migration has not been applied yet.
                setNotice(null)
                return
            }

            setNotice(data || null)
        }

        fetchActiveNotice()
        intervalId = setInterval(fetchActiveNotice, POLL_INTERVAL_MS)

        return () => {
            isMounted = false
            if (intervalId) clearInterval(intervalId)
        }
    }, [])

    useEffect(() => {
        if (!notice || !noticeVersion) return
        if (dismissed) return
        if (notificationPermission !== 'granted') return
        if (notifiedVersionRef.current === noticeVersion) return
        if (typeof window === 'undefined' || !('Notification' in window)) return

        notifiedVersionRef.current = noticeVersion
        try {
            const suffix = notice.starts_at
                ? ` Starts: ${toReadableDate(notice.starts_at)}`
                : ''
            new Notification('GoArtisans update notice', {
                body: `${notice.message}${suffix}`
            })
        } catch {
            // Ignore browser notification failures and keep in-app banner.
        }
    }, [notice, noticeVersion, dismissed, notificationPermission])

    const enableBrowserAlerts = async () => {
        if (typeof window === 'undefined' || !('Notification' in window)) return
        try {
            const result = await Notification.requestPermission()
            setNotificationPermission(result)
        } catch {
            setNotificationPermission('denied')
        }
    }

    const dismissNotice = () => {
        if (!noticeVersion || typeof window === 'undefined') return
        localStorage.setItem('dismissed_update_notice_version', noticeVersion)
        setDismissed(true)
    }

    if (!notice || dismissed) {
        return null
    }

    return (
        <div className="bg-amber-50 border-b border-amber-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-amber-900 text-sm sm:text-base font-medium">
                    <span className="font-semibold">Planned update:</span> {notice.message}
                    {notice.starts_at && (
                        <span className="block sm:inline sm:ml-2 text-amber-800">
                            Starts: {toReadableDate(notice.starts_at)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {notificationPermission !== 'granted' && (
                        <button
                            type="button"
                            onClick={enableBrowserAlerts}
                            className="px-3 py-1.5 text-xs sm:text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 transition"
                        >
                            Enable Alerts
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={dismissNotice}
                        className="px-3 py-1.5 text-xs sm:text-sm rounded-md border border-amber-600 text-amber-700 hover:bg-amber-100 transition"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    )
}
