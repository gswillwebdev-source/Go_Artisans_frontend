import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' })
    }

    // Retrieve last 20 messages for this user
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('message, response, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch chat history' })
    }

    return res.status(200).json({
      success: true,
      messages: messages || []
    })
  } catch (error) {
    console.error('Chat history error:', error)
    return res.status(500).json({ error: 'Failed to fetch chat history' })
  }
}
