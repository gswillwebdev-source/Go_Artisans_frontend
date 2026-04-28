-- CORRECTED SUPABASE SQL COMMANDS FOR JOB NOTIFICATION EMAILS
-- Run these in Supabase SQL Editor in order

-- ============================================================================
-- Step 1: Install HTTP Extension (Correct way for Supabase)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS http;

-- Verify it's installed
SELECT * FROM pg_available_extensions WHERE name = 'http';

-- ============================================================================
-- Step 2: Add Email Tracking Columns to job_notifications Table
-- ============================================================================
ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_job_notifications_email_sent
ON job_notifications(worker_id, email_sent);

-- ============================================================================
-- Step 3: Test HTTP Extension (Run this first to verify it works)
-- ============================================================================
-- This will test if http is working
SELECT http_post(
  'https://httpbin.org/post',
  '{"test": "data"}'::jsonb,
  'application/json'
);

-- ============================================================================
-- Step 4: Create Enhanced Trigger Function (REPLACES OLD TRIGGER)
-- ============================================================================
DROP TRIGGER IF EXISTS on_new_job_create_notifications ON jobs;
DROP FUNCTION IF EXISTS trigger_send_job_notifications() CASCADE;

-- Create new trigger function WITHOUT http_post (simpler version first)
CREATE OR REPLACE FUNCTION trigger_send_job_notifications()
RETURNS TRIGGER AS $$
DECLARE
  alert RECORD;
  notification RECORD;
  job_keywords TEXT[];
  matched_count INT := 0;
BEGIN
  -- Extract keywords from job
  job_keywords := ARRAY[
    NEW.title,
    COALESCE(NEW.description, ''),
    COALESCE(NEW.skills::TEXT, '')
  ];

  -- Find all matching job alerts
  FOR alert IN
    SELECT
      ja.id as alert_id,
      ja.worker_id,
      u.email as worker_email,
      u.first_name as worker_name,
      ja.skills as alert_skills,
      ja.location as alert_location,
      ja.frequency
    FROM job_alerts ja
    JOIN users u ON ja.worker_id = u.id
    WHERE
      -- Match skills: check if any alert skill appears in job title or description
      (
        SELECT COUNT(*)
        FROM unnest(string_to_array(REPLACE(ja.skills, ', ', ','), ',')) AS skill
        WHERE TRIM(skill) != ''
        AND (
          NEW.title ILIKE '%' || TRIM(skill) || '%'
          OR COALESCE(NEW.description, '') ILIKE '%' || TRIM(skill) || '%'
        )
      ) > 0
      -- Match location if specified in alert
      AND (ja.location IS NULL OR ja.location = '' OR NEW.location = ja.location)
      -- Match budget if specified in alert
      AND (ja.max_budget IS NULL OR NEW.budget <= ja.max_budget)
      -- Only notify if not already notified for this job
      AND NOT EXISTS (
        SELECT 1 FROM job_notifications
        WHERE job_id = NEW.id
        AND worker_id = ja.worker_id
      )
  LOOP
    -- Create notification record in database
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

    -- For now, just mark notification as ready
    -- Email will be sent via scheduled function or frontend polling
    UPDATE job_notifications
    SET email_sent = FALSE
    WHERE id = notification.id;

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER on_new_job_create_notifications
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_send_job_notifications();

-- ============================================================================
-- Step 5: Create a Postgres Function to Send Emails (Alternative Approach)
-- ============================================================================
-- This function will be called by a database trigger or cron job
CREATE OR REPLACE FUNCTION send_pending_job_notifications()
RETURNS TABLE (
  notification_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  notification_record RECORD;
  response_status INT;
  request_body JSONB;
BEGIN
  -- Get all unsent notifications
  FOR notification_record IN
    SELECT
      jn.id,
      jn.job_id,
      jn.worker_id,
      u.email as worker_email,
      u.first_name as worker_name,
      j.title as job_title,
      j.description as job_description,
      j.budget as job_budget,
      j.location as job_location
    FROM job_notifications jn
    JOIN users u ON jn.worker_id = u.id
    JOIN jobs j ON jn.job_id = j.id
    WHERE jn.email_sent = FALSE
    LIMIT 50
  LOOP
    BEGIN
      -- Build the request body
      request_body := jsonb_build_object(
        'worker_email', notification_record.worker_email,
        'worker_name', notification_record.worker_name,
        'job_title', notification_record.job_title,
        'job_description', notification_record.job_description,
        'job_budget', notification_record.job_budget,
        'job_location', notification_record.job_location,
        'job_id', notification_record.job_id,
        'notification_id', notification_record.id
      );

      -- Call the Edge Function via HTTP POST
      PERFORM http_post(
        'https://' || current_setting('app.supabase_url') || '/functions/v1/send-job-notification',
        request_body,
        'application/json',
        jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        )
      );

      -- Mark as sent
      UPDATE job_notifications
      SET email_sent = TRUE, email_sent_at = NOW()
      WHERE id = notification_record.id;

      RETURN QUERY SELECT notification_record.id, TRUE, NULL::TEXT;

    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT notification_record.id, FALSE, SQLERRM;
    END;
  END LOOP;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Step 6: Optional - Add Email Preferences to notification_preferences Table
-- ============================================================================
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS send_email_on_match BOOLEAN DEFAULT TRUE;

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS email_frequency VARCHAR DEFAULT 'immediate';

-- ============================================================================
-- UTILITY QUERIES - Use these to monitor email sending
-- ============================================================================

-- View recently sent notifications
SELECT
  jn.id,
  jn.job_id,
  jn.worker_id,
  u.email as worker_email,
  j.title as job_title,
  jn.email_sent,
  jn.email_sent_at,
  jn.created_at
FROM job_notifications jn
JOIN jobs j ON jn.job_id = j.id
JOIN users u ON jn.worker_id = u.id
ORDER BY jn.created_at DESC
LIMIT 20;

-- Count notifications by email_sent status
SELECT
  email_sent,
  COUNT(*) as count
FROM job_notifications
GROUP BY email_sent;

-- Check unsent notifications (for debugging)
SELECT
  jn.id,
  jn.job_id,
  jn.worker_id,
  u.email as worker_email,
  j.title as job_title,
  jn.created_at
FROM job_notifications jn
JOIN jobs j ON jn.job_id = j.id
JOIN users u ON jn.worker_id = u.id
WHERE jn.email_sent = FALSE
ORDER BY jn.created_at DESC
LIMIT 20;

-- ============================================================================
-- MANUAL TEST: Call the send function to test
-- ============================================================================
-- Run this to manually trigger email sending:
-- SELECT * FROM send_pending_job_notifications();
