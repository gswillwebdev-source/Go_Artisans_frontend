'use client'

import Link from 'next/link'
import { useNotificationPolling } from '@/hooks/useNotificationPolling'

export default function NotificationBell() {
    const { unreadCount } = useNotificationPolling()

    return (
        <Link
            href="/notifications"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition border border-transparent"
            title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
        >
            <span className="text-lg leading-none">🔔</span>
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    )
}
