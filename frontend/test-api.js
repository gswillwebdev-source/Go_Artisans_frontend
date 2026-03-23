import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

console.log('Testing API setup...')
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING')
console.log('GEMINI_KEY:', process.env.GOOGLE_GEMINI_API_KEY ? 'SET' : 'MISSING')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('Supabase client created')

async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('faq_articles')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Supabase error:', error)
    } else {
      console.log('✅ Supabase connection successful! Found FAQs:', data.length)
    }
  } catch (err) {
    console.error('Error connecting to Supabase:', err.message)
  }
}

testConnection()
