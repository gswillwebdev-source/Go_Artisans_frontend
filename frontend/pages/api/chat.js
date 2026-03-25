import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const gemini = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY)

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
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      console.error('[CHAT API] GOOGLE_GEMINI_API_KEY is not set')
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
        .limit(10)

      if (faqError) {
        console.warn('[CHAT API] FAQ fetch warning (continuing without FAQs):', faqError.message)
      } else {
        console.log(`[CHAT API] Retrieved ${faqs?.length || 0} FAQs`)
        if (faqs && faqs.length > 0) {
          faqContext = 'Based on these FAQs:\n\n' +
            faqs.map((faq, i) => `${i + 1}. **${faq.question}** (Category: ${faq.category})\n${faq.answer}`).join('\n\n')
        }
      }
    } catch (faqErr) {
      console.warn('[CHAT API] FAQ fetch exception (continuing without FAQs):', faqErr.message)
    }

    // Call Google Gemini API
    console.log('[CHAT API] Initializing Gemini model')
    const model = gemini.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const systemPrompt = `You are a helpful customer support assistant for GoArtisans, a platform connecting clients with skilled artisans for home services (plumbing, electrical, masonry, carpentry, painting, etc.).

LANGUAGE DETECTION RULE (CRITICAL):
- Detect the language of the user's message carefully
- If the user writes in French → respond ONLY in French
- If the user writes in English → respond ONLY in English
- Never mix languages in a single response
- If unclear, default to French

Instructions:
- Be professional, friendly, and concise
- Provide helpful and accurate information about the GoArtisans platform
- For registration, payment, quotes, disputes, or account issues, guide the user step by step
- If you don't know the answer, suggest contacting support at support@goartisans.online
- Never invent features or policies that are not mentioned in the FAQs below
- Keep answers short (3-5 sentences max) unless a detailed explanation is clearly needed

${faqContext}

User's question: ${message}`

    console.log('[CHAT API] Calling Gemini API')
    const result = await model.generateContent(systemPrompt)
    const response = result.response.text()
    console.log('[CHAT API] Gemini response received, length:', response.length)

    // Save to database (non-critical — return the response even if save fails)
    console.log('[CHAT API] Saving message to database')
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
      } else {
        console.log('[CHAT API] Message saved successfully')
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
    console.error('Chat API error:', error)
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      code: error.code
    })

    if (error.message?.includes('API key')) {
      return res.status(500).json({ error: 'API configuration error. Please contact support.' })
    }

    if (error.message?.includes('not found') || error.message?.includes('generateContent')) {
      return res.status(500).json({
        error: 'Google Gemini API access issue. Please ensure: 1) API key is valid, 2) Billing is enabled, 3) API is active in Google Cloud Console.'
      })
    }

    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      return res.status(500).json({
        error: 'Database not configured. Please run CHAT_SYSTEM_SETUP.sql in Supabase.'
      })
    }

    return res.status(500).json({ error: 'Failed to process your message. Please try again.' })
  }
}
