# Fixing the HTTP Extension Error

## What Went Wrong

The error `function extensions.http_post() does not exist` means:
- The `http` extension isn't installed correctly
- Or the function signature is different in your Supabase version

## Solutions (Choose One)

### ✅ **SOLUTION 1: Simple Step-by-Step Fix (Recommended)**

1. **Delete the old SQL commands** - Don't use the original file
2. **Use the NEW file**: `SUPABASE_SQL_COMMANDS_FOR_EMAIL_FIXED.sql`
3. **Run ONLY this command first** to verify HTTP works:

```sql
CREATE EXTENSION IF NOT EXISTS http;

-- Test it
SELECT http_post(
  'https://httpbin.org/post',
  '{"test": "data"}'::jsonb,
  'application/json'
);
```

If this works, continue with the rest. If it fails, use Solution 2.

### ✅ **SOLUTION 2: If HTTP Extension Still Fails (Alternative)**

If Solution 1 doesn't work, use this simpler approach (NO HTTP needed):

```sql
-- 1. Add columns
ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL;

-- 2. Create simple trigger (WITHOUT http_post)
DROP TRIGGER IF EXISTS on_new_job_create_notifications ON jobs;
DROP FUNCTION IF EXISTS trigger_send_job_notifications() CASCADE;

CREATE OR REPLACE FUNCTION trigger_send_job_notifications()
RETURNS TRIGGER AS $$
DECLARE
  alert RECORD;
  notification RECORD;
BEGIN
  -- Find matching alerts and create notifications
  FOR alert IN
    SELECT
      ja.id as alert_id,
      ja.worker_id,
      ja.skills,
      ja.location as alert_location,
      ja.max_budget
    FROM job_alerts ja
    WHERE
      (
        SELECT COUNT(*)
        FROM unnest(string_to_array(REPLACE(ja.skills, ', ', ','), ',')) AS skill
        WHERE TRIM(skill) != ''
        AND (
          NEW.title ILIKE '%' || TRIM(skill) || '%'
          OR COALESCE(NEW.description, '') ILIKE '%' || TRIM(skill) || '%'
        )
      ) > 0
      AND (ja.location IS NULL OR ja.location = '' OR NEW.location = ja.location)
      AND (ja.max_budget IS NULL OR NEW.budget <= ja.max_budget)
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications
        WHERE job_id = NEW.id AND worker_id = ja.worker_id
      )
  LOOP
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
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_job_create_notifications
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_send_job_notifications();
```

### ✅ **SOLUTION 3: Use Backend/Frontend to Send Emails (No Database HTTP)**

Instead of calling HTTP from the database, send emails from:
- **Option A**: Your Next.js backend API route
- **Option B**: Use Supabase Functions directly (call from frontend)

## Step-by-Step Instructions

### **If Using Solution 1 or 2:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Create a **NEW** query
3. Copy-paste the commands from `SUPABASE_SQL_COMMANDS_FOR_EMAIL_FIXED.sql`
4. Click **Run**
5. Wait for all commands to complete successfully

### **If Using Solution 3 (Recommended for simplicity):**

Create a **Next.js API route** that sends emails instead:

```javascript
// frontend/pages/api/send-job-notification.js
import { Resend } from 'resend'
// OR import { Client } from '@sendgrid/mail'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    worker_email,
    worker_name,
    job_title,
    job_description,
    job_budget,
    job_location
  } = req.body

  try {
    // Using Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const response = await resend.emails.send({
      from: 'noreply@goartisans.online',
      to: worker_email,
      subject: `New Job Match: ${job_title}`,
      html: `
        <h2>New Job Match!</h2>
        <p>Hi ${worker_name},</p>
        <p>A job matching your criteria was just posted:</p>
        <h3>${job_title}</h3>
        <p>${job_description}</p>
        <p><strong>Budget:</strong> CFA ${job_budget}</p>
        <p><strong>Location:</strong> ${job_location}</p>
        <a href="https://goartisans.online/jobs/${job_id}">View Job</a>
      `
    })

    return res.status(200).json({ success: true, id: response.id })
  } catch (error) {
    console.error('Error sending email:', error)
    return res.status(500).json({ error: error.message })
  }
}
```

Then call this from your trigger or frontend.

---

## Recommended Path Forward

**I recommend Solution 3** because:
- ✅ No complex database HTTP setup
- ✅ Easier to debug
- ✅ Can test API easily with Postman
- ✅ Works reliably with Resend/SendGrid
- ✅ Better error handling

**Simpler Flow:**
1. Job posted → Trigger creates notification record
2. Frontend polling detects new notification
3. Frontend calls API route to send email
4. Email sent immediately

---

## Quick Fix: Try This First

Just run this in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS http;

-- Test if it works
SELECT http_post(
  'https://httpbin.org/post',
  '{"test": 1}'::jsonb,
  'application/json'
);
```

If you see a successful response (status 200), the extension works.

If you get an error, use **Solution 3** (API route approach) instead.

---

## Which Solution Do You Want?

1. **Keep trying with Supabase SQL** → Use `SUPABASE_SQL_COMMANDS_FOR_EMAIL_FIXED.sql`
2. **Try backend API route** → I'll create the code
3. **Just test if HTTP works** → Run the test query above first

Let me know which approach you prefer!
