import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      return await getNotifications(req, res)
    } else if (req.method === 'PUT') {
      return await updateNotification(req, res)
    } else if (req.method === 'DELETE') {
      return await deleteNotification(req, res)
    } else {
      return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('[NOTIFICATIONS API] Error:', error)
    return res.status(500).json({ error: 'Failed to process notification request' })
  }
}

async function getNotifications(req, res) {
  const { userId, limit = 20, offset = 0 } = req.query

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  console.log('[NOTIFICATIONS API] Fetching notifications for:', userId)

  try {
    // Fetch notifications
    const { data: notifications, error: notificationsError } = await supabase
      .from('notifications')
      .select(`
        id, type, related_user_id, related_job_id, title, message,
        is_read, action_url, created_at,
        related_user:related_user_id (
          id, first_name, last_name, profile_picture
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (notificationsError) {
      console.error('[NOTIFICATIONS API] Fetch error:', notificationsError)
      throw notificationsError
    }

    // Count unread notifications
    const { data: unreadData, error: unreadError } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    const unreadCount = unreadError ? 0 : (unreadData?.length || 0)

    console.log('[NOTIFICATIONS API] Retrieved', notifications?.length || 0, 'notifications')

    return res.status(200).json({
      notifications: notifications || [],
      unread_count: unreadCount
    })

  } catch (error) {
    console.error('[NOTIFICATIONS API] Get error:', error)
    throw error
  }
}

async function updateNotification(req, res) {
  const { notification_id, is_read } = req.body

  if (!notification_id || is_read === undefined) {
    return res.status(400).json({ error: 'notification_id and is_read are required' })
  }

  console.log('[NOTIFICATIONS API] Updating notification:', notification_id)

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: is_read, updated_at: new Date().toISOString() })
      .eq('id', notification_id)

    if (error) {
      console.error('[NOTIFICATIONS API] Update error:', error)
      throw error
    }

    console.log('[NOTIFICATIONS API] Notification updated')

    return res.status(200).json({
      success: true,
      message: 'Notification updated'
    })

  } catch (error) {
    console.error('[NOTIFICATIONS API] Update error:', error)
    throw error
  }
}

async function deleteNotification(req, res) {
  const { notification_id } = req.body

  if (!notification_id) {
    return res.status(400).json({ error: 'notification_id is required' })
  }

  console.log('[NOTIFICATIONS API] Deleting notification:', notification_id)

  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification_id)

    if (error) {
      console.error('[NOTIFICATIONS API] Delete error:', error)
      throw error
    }

    console.log('[NOTIFICATIONS API] Notification deleted')

    return res.status(200).json({
      success: true,
      message: 'Notification deleted'
    })

  } catch (error) {
    console.error('[NOTIFICATIONS API] Delete error:', error)
    throw error
  }
}
