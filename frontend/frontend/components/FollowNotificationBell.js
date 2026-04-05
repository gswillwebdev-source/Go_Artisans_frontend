'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function FollowNotificationBell({ userId }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const { t } = useLanguage()

  // Fetch notifications on mount and periodically
  useEffect(() => {
    if (!userId) return

    const fetchNotifications = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/notifications?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unread_count || 0)
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const markNotificationAsRead = async (notificationId) => {
    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId,
          is_read: true
        })
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-indigo-600 transition"
        title={t('notificationsBell')}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158v-3.847a6.032 6.032 0 00-9-5.519m0 0A6.022 6.022 0 003 12c0 .896.153 1.755.43 2.552m13.07 0a6.032 6.032 0 01-9 5.519m13.07-5.519A6.023 6.023 0 019 20.5H3v-2a6 6 0 0111.13-3.447M9 20.5H3"
          />
        </svg>

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-bold text-lg">{t('notificationsBell')}</h3>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>{t('loadingNotifications')}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>{t('noNotificationsYet')}</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${!notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  onClick={() => !notification.is_read && markNotificationAsRead(notification.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>

                  {/* Action link */}
                  {notification.action_url && (
                    <Link
                      href={notification.action_url}
                      className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 inline-block"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t('viewAction')} →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <Link
                href="/notifications"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                {t('viewAllNotifications')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
