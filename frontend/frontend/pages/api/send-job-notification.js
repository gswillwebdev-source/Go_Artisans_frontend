import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ACCOUNT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      notification_id,
      worker_email,
      worker_name,
      job_title,
      job_description,
      job_budget,
      job_location,
      job_id,
      frequency
    } = req.body

    if (!worker_email || !job_title) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Determine if email should be sent based on frequency
    const shouldSendNow = await shouldSendEmail(frequency, worker_email)

    if (!shouldSendNow) {
      // Queue for later (daily/weekly)
      return res.status(200).json({
        success: true,
        queued: true,
        message: `Email queued for ${frequency} digest`
      })
    }

    // Send email immediately
    const response = await resend.emails.send({
      from: 'noreply@goartisans.online',
      to: worker_email,
      subject: `New Job Match: ${job_title}`,
      html: buildEmailHTML({
        worker_name,
        job_title,
        job_description,
        job_budget,
        job_location,
        job_id
      })
    })

    // Mark as sent
    if (notification_id) {
      await supabase
        .from('job_notifications')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
        .eq('id', notification_id)
    }

    return res.status(200).json({ success: true, id: response.id })
  } catch (error) {
    console.error('Error sending email:', error)
    return res.status(500).json({ error: error.message })
  }
}

// Check if email should be sent based on frequency
async function shouldSendEmail(frequency, workerEmail) {
  // Immediate emails always send
  if (frequency === 'immediate') {
    return true
  }

  // For daily: check if email was already sent today
  if (frequency === 'daily') {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('job_notifications')
      .select('id')
      .eq('worker_id', (await getWorkerId(workerEmail)))
      .eq('email_sent', true)
      .gte('email_sent_at', `${today}T00:00:00`)
      .limit(1)

    // If no email sent today, send it
    return (!data || data.length === 0)
  }

  // For weekly: check if email was already sent this week
  if (frequency === 'weekly') {
    const today = new Date()
    const mondayOfThisWeek = new Date(today)
    mondayOfThisWeek.setDate(today.getDate() - today.getDay() + 1)
    const weekStart = mondayOfThisWeek.toISOString().split('T')[0]

    const { data } = await supabase
      .from('job_notifications')
      .select('id')
      .eq('worker_id', (await getWorkerId(workerEmail)))
      .eq('email_sent', true)
      .gte('email_sent_at', `${weekStart}T00:00:00`)
      .limit(1)

    // If no email sent this week, send it
    return (!data || data.length === 0)
  }

  return false
}

async function getWorkerId(workerEmail) {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('email', workerEmail)
    .single()

  return data?.id
}

function buildEmailHTML(data) {
  const {
    worker_name,
    job_title,
    job_description,
    job_budget,
    job_location,
    job_id
  } = data

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .job-details { background: white; padding: 15px; border-left: 4px solid #4F46E5; margin: 15px 0; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
          .footer { font-size: 12px; color: #999; margin-top: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔔 New Job Match!</h2>
            <p>A job opportunity matching your skills just posted</p>
          </div>

          <div class="content">
            <p>Hi ${worker_name || 'there'},</p>

            <p>Great news! A job matching your criteria has been posted on Go Artisans.</p>

            <div class="job-details">
              <h3 style="margin-top: 0;">${job_title}</h3>

              ${job_description ? `
                <p><strong>Description:</strong></p>
                <p>${job_description.substring(0, 200)}...</p>
              ` : ''}

              <div style="margin-top: 12px;">
                ${job_budget ? `<p><strong>💰 Budget:</strong> CFA ${job_budget}</p>` : ''}
                ${job_location ? `<p><strong>📍 Location:</strong> ${job_location}</p>` : ''}
              </div>
            </div>

            <p>Don't miss this opportunity!</p>

            ${job_id ? `
              <a href="https://goartisans.online/jobs/${job_id}" class="button">View Job Details →</a>
            ` : ''}

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              You're receiving this email because you have an active job alert on Go Artisans.
              <a href="https://goartisans.online/notifications" style="color: #4F46E5;">Manage your preferences</a>
            </p>
          </div>

          <div class="footer">
            <p>© 2026 Go Artisans. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `
}
