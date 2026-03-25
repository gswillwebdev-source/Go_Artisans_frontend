# Supabase SQL Commands - Run These in Supabase SQL Editor

## IMPORTANT: Run all these SQL commands in your Supabase SQL Editor

Copy and paste ALL of this into Supabase → SQL Editor → Click "Run"

```sql
-- ============================================================================
-- Step 1: Add Email Tracking Columns
-- ============================================================================
ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_notifications_email_sent
ON job_notifications(worker_id, email_sent);

-- ============================================================================
-- Step 2: Drop Old Trigger (if exists from previous attempt)
-- ============================================================================
DROP TRIGGER IF EXISTS on_new_job_create_notifications ON jobs;
DROP FUNCTION IF EXISTS trigger_send_job_notifications() CASCADE;

-- ============================================================================
-- Step 3: Create New Simple Trigger (NO HTTP - Just creates notifications)
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_send_job_notifications()
RETURNS TRIGGER AS $$
DECLARE
  alert RECORD;
BEGIN
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

-- Create the trigger
CREATE TRIGGER on_new_job_create_notifications
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_send_job_notifications();
```

---

## ✅ That's All the SQL You Need!

Once you run the above SQL commands, your Supabase database is ready.

The system will now:
1. ✅ Create notifications when jobs are posted
2. ✅ Match jobs to worker alerts automatically
3. ✅ Set `email_sent = FALSE` on new notifications
4. ✅ Frontend will send emails via the API route

---

## What Happens After:

1. **Job Posted** → Trigger creates notification in `job_notifications` table
2. **Frontend Polling** (every 30 sec) → Detects notification with `email_sent = FALSE`
3. **API Call** → Frontend calls `/api/send-job-notification`
4. **Email Sent** → Resend API sends email to worker
5. **Update DB** → Mark `email_sent = TRUE`

No more database HTTP issues! ✅
