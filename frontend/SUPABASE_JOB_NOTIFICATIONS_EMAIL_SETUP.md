# Job Notification Emails Setup (Option A: Supabase Functions + SendGrid/Resend)

## Overview

This guide sets up automated email notifications when workers receive new job alerts using Supabase Edge Functions + SendGrid or Resend.

**Architecture:**
1. Worker creates a job alert (stored in `job_alerts` table)
2. New job is posted (stored in `jobs` table)
3. Postgres trigger `on_new_job_create_notifications` runs
4. SQL function `match_job_to_alerts()` matches jobs to alerts
5. Notifications created in `job_notifications` table
6. **NEW:** Supabase Edge Function calls SendGrid/Resend API to send email
7. Worker receives email with job details

---

## Step 1: Choose Email Service

### Option A1: SendGrid (Recommended for high volume)

**Pros:**
- Reliable delivery
- Good spam filtering
- Analytics dashboard
- Free tier: 100 emails/day

**Setup:**
1. Create free account at https://sendgrid.com
2. Get API key from Dashboard → Settings → API Keys
3. Set up sender address verification

### Option A2: Resend (Recommended for simplicity)

**Pros:**
- Simpler API
- Developer-friendly
- Good for small/medium volumes
- Free tier: 100 emails/day

**Setup:**
1. Create account at https://resend.com
2. Get API key from Dashboard → API Keys
3. Verify sender domain (optional for dev)

---

## Step 2: Create Supabase Edge Function

### Initialize Function Locally

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Create new function
supabase functions new send-job-notification

# Navigate to function
cd supabase/functions/send-job-notification
```

### Create Function File

Create `supabase/functions/send-job-notification/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const EMAIL_FROM = 'noreply@goartisans.online'
const APP_URL = 'https://goartisans.online' // Change to your domain

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const {
      worker_email,
      worker_name,
      job_title,
      job_description,
      job_budget,
      job_location,
      job_id,
      notification_id
    } = await req.json()

    // Validate required fields
    if (!worker_email || !job_title) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      )
    }

    let success = false
    let error_msg = ''

    // Try SendGrid first if API key exists
    if (SENDGRID_API_KEY) {
      success = await sendViaSendGrid({
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
    }
    // Fall back to Resend
    else if (RESEND_API_KEY) {
      success = await sendViaResend({
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
    } else {
      error_msg = 'No email service configured'
    }

    // Mark notification as sent in database
    if (success && notification_id) {
      await markNotificationAsSent(notification_id)
    }

    return new Response(
      JSON.stringify({
        success,
        message: success ? 'Email sent successfully' : error_msg
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: success ? 200 : 500
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
})

// SendGrid sender function
async function sendViaS entGrid(options: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: EMAIL_FROM, name: 'Go Artisans' },
        subject: options.subject,
        content: [{ type: 'text/html', value: options.html }],
        reply_to: { email: EMAIL_FROM }
      })
    })

    return response.status === 202
  } catch (error) {
    console.error('SendGrid error:', error)
    return false
  }
}

// Resend sender function
async function sendViaResend(options: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        reply_to: EMAIL_FROM
      })
    })

    const data = await response.json()
    return response.status === 200 && data.id
  } catch (error) {
    console.error('Resend error:', error)
    return false
  }
}

// Build email HTML template
function buildEmailHTML(data: {
  worker_name?: string
  job_title: string
  job_description?: string
  job_budget?: number
  job_location?: string
  job_id?: string
}): string {
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
            <p>A job opportunity matching your skills and interests just posted</p>
          </div>

          <div class="content">
            ${data.worker_name ? `<p>Hi ${data.worker_name},</p>` : ''}

            <p>Great news! A job matching your criteria has been posted on Go Artisans.</p>

            <div class="job-details">
              <h3 style="margin-top: 0;">${data.job_title}</h3>

              ${data.job_description ? `
                <p><strong>Description:</strong></p>
                <p>${data.job_description.substring(0, 200)}...</p>
              ` : ''}

              <div style="margin-top: 12px;">
                ${data.job_budget ? `<p><strong>💰 Budget:</strong> CFA ${data.job_budget}</p>` : ''}
                ${data.job_location ? `<p><strong>📍 Location:</strong> ${data.job_location}</p>` : ''}
              </div>
            </div>

            <p>Don't miss this opportunity!</p>

            ${data.job_id ? `
              <a href="${APP_URL}/jobs/${data.job_id}" class="button">View Job Details →</a>
            ` : ''}

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
              You're receiving this email because you have an active job alert on Go Artisans.
              <a href="${APP_URL}/notifications" style="color: #4F46E5; text-decoration: none;">Manage your preferences</a>
            </p>
          </div>

          <div class="footer">
            <p>© 2026 Go Artisans. All rights reserved.</p>
            <p>You can manage your job alerts in your <a href="${APP_URL}/job-alerts" style="color: #4F46E5;">alert preferences</a>.</p>
          </div>
        </div>
      </body>
    </html>
  `
}

// Mark notification as sent in database
async function markNotificationAsSent(notification_id: string) {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || ''
    )

    await supabase
      .from('job_notifications')
      .update({ email_sent: true, email_sent_at: new Date().toISOString() })
      .eq('id', notification_id)
  } catch (error) {
    console.error('Error marking notification as sent:', error)
  }
}
```

---

## Step 3: Configure Environment Variables

### In Supabase Dashboard:

1. Go to **Project Settings** → **Edge Functions** → **Create Function Secrets**
2. Add either:
   - For SendGrid: `SENDGRID_API_KEY` = your SendGrid API key
   - For Resend: `RESEND_API_KEY` = your Resend API key

---

## Step 4: Add SQL Columns to Track Email Sending

Run this SQL in Supabase SQL Editor:

```sql
-- Add email tracking columns to job_notifications table
ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_notifications_email_sent
ON job_notifications(worker_id, email_sent);
```

---

## Step 5: Update Postgres Trigger to Call Edge Function

Replace the existing `on_new_job_create_notifications` trigger with this enhanced version:

```sql
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_new_job_create_notifications ON jobs;
DROP FUNCTION IF EXISTS trigger_send_job_notifications() CASCADE;

-- Create enhanced trigger function that calls Edge Function
CREATE OR REPLACE FUNCTION trigger_send_job_notifications()
RETURNS TRIGGER AS $$
DECLARE
  alert RECORD;
  notification RECORD;
  decoded_skills TEXT[];
  job_keywords TEXT[];
  matched_count INT := 0;
BEGIN
  -- Extract keywords from job title and description
  job_keywords := ARRAY[
    NEW.title,
    COALESCE(NEW.description, ''),
    COALESCE(NEW.skills::TEXT, '')
  ];

  -- Find all alerts matching this job
  FOR alert IN
    SELECT
      ja.id as alert_id,
      ja.worker_id,
      u.email as worker_email,
      u.first_name as worker_name,
      ja.frequency,
      ja.location as alert_location
    FROM job_alerts ja
    JOIN users u ON ja.worker_id = u.id
    WHERE
      -- Match skills
      (
        SELECT COUNT(*)
        FROM unnest(string_to_array(ja.skills, ',')) AS skill
        WHERE (
          NEW.title ILIKE '%' || TRIM(skill) || '%'
          OR NEW.description ILIKE '%' || TRIM(skill) || '%'
        )
      ) > 0
      -- Match location if specified
      AND (ja.location IS NULL OR ja.location = '' OR NEW.location = ja.location)
      -- Match budget if specified
      AND (ja.max_budget IS NULL OR NEW.budget <= ja.max_budget)
      -- Don't notify if already notified for this job
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications
        WHERE job_id = NEW.id
        AND worker_id = ja.worker_id
      )
  LOOP
    -- Create notification record
    INSERT INTO job_notifications (
      job_id,
      worker_id,
      alert_id,
      status,
      created_at
    ) VALUES (
      NEW.id,
      alert.worker_id,
      alert.alert_id,
      'new',
      NOW()
    ) RETURNING * INTO notification;

    matched_count := matched_count + 1;

    -- Call Supabase Edge Function to send email asynchronously
    -- This uses http extension to call the function
    PERFORM http_post(
      'https://' || current_setting('app.supabase_url') || '/functions/v1/send-job-notification',
      jsonb_build_object(
        'worker_email', alert.worker_email,
        'worker_name', alert.worker_name,
        'job_title', NEW.title,
        'job_description', NEW.description,
        'job_budget', NEW.budget,
        'job_location', NEW.location,
        'job_id', NEW.id,
        'notification_id', notification.id
      ),
      'application/json',
      jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
      ),
      1000
    );

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_new_job_create_notifications
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_send_job_notifications();
```

---

## Step 6: Enable HTTP Extension

Run this SQL to enable the `http` extension in Supabase:

```sql
-- Enable HTTP extension for making API calls from Postgres
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Give public role permission to use it
GRANT EXECUTE ON FUNCTION http_post(URL TEXT, BODY JSONB, CONTENT_TYPE TEXT, HEADERS JSONB, TIMEOUT INT)
TO postgres, authenticated, anon;
```

---

## Step 7: Deploy Edge Function

```bash
# From your project root
supabase functions deploy send-job-notification

# Verify deployment
supabase functions list
```

---

## Step 8: Test the Setup

### Test Job Notification Email Sending

1. Create a test job alert as a worker
2. Create a test job that matches the alert
3. Check worker's email for notification

### Manual Test (Optional)

You can test the Edge Function directly:

```bash
# Test via curl (replace YOUR_FUNCTION_URL and YOUR_ANON_KEY)
curl -X POST https://YOUR_PROJECT_URL/functions/v1/send-job-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "worker_email": "worker@example.com",
    "worker_name": "John Doe",
    "job_title": "Web Designer Needed",
    "job_description": "Need a website redesign",
    "job_budget": 50000,
    "job_location": "Lome",
    "job_id": "123"
  }'
```

---

## Step 9: Update Frontend Notification Preferences (Optional)

Add fields for email notification settings:

```sql
-- Add email preference columns if not already present
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS send_email_on_match BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_frequency VARCHAR DEFAULT 'immediate'; -- immediate, daily, weekly

-- Example update:
UPDATE notification_preferences
SET send_email_on_match = TRUE, email_frequency = 'immediate'
WHERE user_id = auth.uid();
```

---

## Step 10: Monitor Email Sending

View email sending status:

```sql
-- Check sent notifications
SELECT
  jn.id,
  jn.job_id,
  jn.worker_id,
  jn.email_sent,
  jn.email_sent_at,
  j.title as job_title,
  u.email as worker_email
FROM job_notifications jn
JOIN jobs j ON jn.job_id = j.id
JOIN users u ON jn.worker_id = u.id
WHERE jn.email_sent = TRUE
ORDER BY jn.email_sent_at DESC
LIMIT 20;

-- Check unsent notifications (for debugging)
SELECT
  jn.id,
  jn.job_id,
  jn.worker_id,
  j.title as job_title,
  u.email as worker_email
FROM job_notifications jn
JOIN jobs j ON jn.job_id = j.id
JOIN users u ON jn.worker_id = u.id
WHERE jn.email_sent = FALSE
ORDER BY jn.created_at DESC
LIMIT 20;
```

---

## Troubleshooting

### Emails not being sent:

1. **Check Edge Function logs:**
   ```bash
   supabase functions logs send-job-notification
   ```

2. **Verify API key is set:**
   - Go to Supabase Dashboard → Project Settings → Edge Functions Secrets
   - Confirm `SENDGRID_API_KEY` or `RESEND_API_KEY` is present

3. **Check email service account:**
   - SendGrid: Verify sender email is confirmed
   - Resend: Check API key is valid

4. **Database trigger issues:**
   - Verify `http` extension is installed: `SELECT * FROM pg_available_extensions WHERE name = 'http';`
   - Check if trigger is enabled: `SELECT * FROM pg_trigger WHERE tgname = 'on_new_job_create_notifications';`

---

## Summary of SQL Commands

All SQL needed:

```sql
-- 1. Add HTTP extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Add email tracking columns
ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL;

-- 3. Create index
CREATE INDEX IF NOT EXISTS idx_job_notifications_email_sent
ON job_notifications(worker_id, email_sent);

-- 4. Trigger function (from Step 5 above)
-- Deploy the full trigger function from Step 5

-- 5. Optional: Add email preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS send_email_on_match BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_frequency VARCHAR DEFAULT 'immediate';
```

---

## Environment Variables Needed

For **SendGrid**:
- `SENDGRID_API_KEY` - Your SendGrid API key

For **Resend**:
- `RESEND_API_KEY` - Your Resend API key

Set these in Supabase Dashboard → Project Settings → Edge Functions → Function Secrets

---

## Architecture Diagram

```
New Job Created
    ↓
PostgreSQL Trigger fires
    ↓
match_job_to_alerts() SQL function
    ↓
Create job_notifications records
    ↓
Trigger calls Edge Function via HTTP
    ↓
Supabase Edge Function (send-job-notification)
    ↓
SendGrid / Resend API
    ↓
Email sent to worker
    ↓
Mark notification.email_sent = TRUE
```

---

## Next Steps

1. Set up email service account (SendGrid or Resend)
2. Create Edge Function locally
3. Set environment variables in Supabase
4. Deploy Edge Function
5. Run SQL migration to enable `http` extension and add columns
6. Update the trigger function
7. Test with a job creation
8. Monitor logs if emails don't arrive

Done! Workers will now receive email notifications when jobs matching their alerts are posted.
