import { createClient } from '@supabase/supabase-js'
import Groq from 'groq-sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Rate limiting configuration
const RATE_LIMIT = 5 // messages per day for anonymous users
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000 // 24 hours in ms

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('[CHAT API] Request received', { message: req.body.message?.substring(0, 20), userId: req.body.userId })
    const { message, sessionId, userId } = req.body

    // Validation
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (message.trim().length === 0 || message.length > 500) {
      return res.status(400).json({ error: 'Message must be between 1 and 500 characters' })
    }

    // Early check for missing API key
    if (!process.env.GROQ_API_KEY) {
      console.error('[CHAT API] GROQ_API_KEY is not set')
      return res.status(500).json({ error: 'API configuration error. Please contact support.' })
    }

    // Get user identifier
    const isAuthenticated = !!userId
    const identifier = isAuthenticated ? userId : req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress

    // Rate limiting for anonymous users
    if (!isAuthenticated) {
      const { data: rateLimitData } = await supabase
        .from('rate_limit_tracker')
        .select('*')
        .eq('identifier', identifier)
        .single()

      if (rateLimitData) {
        const resetTime = new Date(rateLimitData.reset_at)
        const now = new Date()

        if (now < resetTime) {
          if (rateLimitData.message_count >= RATE_LIMIT) {
            const retryAfter = Math.ceil((resetTime - now) / 1000)
            return res.status(429).json({
              error: `Rate limit exceeded. You have ${RATE_LIMIT} messages per day.`,
              rateLimitRemaining: 0,
              retryAfter
            })
          }

          // Increment message count
          await supabase
            .from('rate_limit_tracker')
            .update({
              message_count: rateLimitData.message_count + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', rateLimitData.id)

          const rateLimitRemaining = RATE_LIMIT - (rateLimitData.message_count + 1)
          var remainingLimit = rateLimitRemaining
        } else {
          // Reset counter
          await supabase
            .from('rate_limit_tracker')
            .update({
              message_count: 1,
              reset_at: new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', rateLimitData.id)

          remainingLimit = RATE_LIMIT - 1
        }
      } else {
        // Create new rate limit record
        await supabase
          .from('rate_limit_tracker')
          .insert({
            identifier,
            user_type: 'anonymous',
            message_count: 1,
            reset_at: new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString()
          })

        remainingLimit = RATE_LIMIT - 1
      }
    } else {
      remainingLimit = null // unlimited for authenticated users
    }

    // Retrieve relevant FAQs for context (non-critical — continue if it fails)
    console.log('[CHAT API] Fetching FAQs from Supabase')
    let faqContext = ''
    try {
      const { data: faqs, error: faqError } = await supabase
        .from('faq_articles')
        .select('question, answer, category')
        .eq('is_active', true)
        .limit(5)

      if (faqError) {
        console.warn('[CHAT API] FAQ fetch warning (continuing without FAQs):', faqError.message)
      } else {
        console.log(`[CHAT API] Retrieved ${faqs?.length || 0} FAQs`)
        if (faqs && faqs.length > 0) {
          faqContext = 'Relevant FAQs:\n\n' +
            faqs.map((faq, i) => `${i + 1}. Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')
        }
      }
    } catch (faqErr) {
      console.warn('[CHAT API] FAQ fetch exception (continuing without FAQs):', faqErr.message)
    }

    // Build system prompt
    const systemPrompt = `You are a helpful customer support assistant for GoArtisans, a platform connecting clients with skilled artisans for home services (plumbing, electrical, masonry, carpentry, painting, etc.).

LANGUAGE RULE (CRITICAL): Detect the language of the user's message and respond ONLY in that language. French message → French reply. English message → English reply. Never mix languages.

Instructions:
- Be professional, friendly, and concise
- Guide users step by step for registration, payment, quotes, and dispute issues
- If you don't know the answer, suggest contacting support@goartisans.online
- Never invent features or policies not mentioned in the FAQs
- Keep answers to 3-5 sentences unless more detail is clearly needed

${faqContext}`

    // Call Groq API
    console.log('[CHAT API] Calling Groq API')
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      max_tokens: 500,
      temperature: 0.7
    })

    const response = completion.choices[0].message.content
    console.log('[CHAT API] Groq response received, length:', response.length)

    // Save to database (non-critical — return the response even if save fails)
    try {
      const { error: saveError } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId || null,
          session_id: sessionId,
          message: message.trim(),
          response: response,
          ip_address: identifier
        })

      if (saveError) {
        console.warn('[CHAT API] Save warning (response still returned):', saveError.message)
      }
    } catch (saveErr) {
      console.warn('[CHAT API] Save exception (response still returned):', saveErr.message)
    }

    return res.status(200).json({
      success: true,
      response,
      rateLimitRemaining: remainingLimit
    })
  } catch (error) {
    console.error('Chat API error:', error.message)
    return res.status(500).json({ error: error.message || 'Failed to process your message. Please try again.' })
  }
}
