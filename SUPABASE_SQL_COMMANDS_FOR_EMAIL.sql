-- SUPABASE SQL COMMANDS FOR JOB NOTIFICATION EMAILS (Option A)
-- Run these in Supabase SQL Editor

-- ============================================================================
-- Step 1: Enable HTTP Extension (REQUIRED for calling Edge Function)
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Grant permissions
GRANT EXECUTE ON FUNCTION extensions.http_post(
  url TEXT,
  body JSONB,
  content_type TEXT,
  headers JSONB,
  timeout INT
) TO postgres, authenticated, anon;

-- ============================================================================
-- Step 2: Add Email Tracking Columns to job_notifications Table
-- ============================================================================
ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL;

-- Create index for faster queries on email_sent status
CREATE INDEX IF NOT EXISTS idx_job_notifications_email_sent
ON job_notifications(worker_id, email_sent);

-- ============================================================================
-- Step 3: Create Enhanced Trigger Function (REPLACES OLD TRIGGER)
-- ============================================================================
-- First, drop old trigger if exists
DROP TRIGGER IF EXISTS on_new_job_create_notifications ON jobs;
DROP FUNCTION IF EXISTS trigger_send_job_notifications() CASCADE;

-- Create new trigger function that calls Edge Function
CREATE OR REPLACE FUNCTION trigger_send_job_notifications()
RETURNS TRIGGER AS $$
DECLARE
  alert RECORD;
  notification RECORD;
  job_keywords TEXT[];
  matched_count INT := 0;
  function_url TEXT;
  auth_header TEXT;
BEGIN
  -- Get Supabase URL and anon key from settings
  function_url := 'https://' || current_setting('app.supabase_url') || '/functions/v1/send-job-notification';
  auth_header := 'Bearer ' || current_setting('app.supabase_anon_key');

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

    -- Call Edge Function to send email (asynchronously)
    BEGIN
      PERFORM http_post(
        function_url,
        jsonb_build_object(
          'worker_email', alert.worker_email,
          'worker_name', alert.worker_name,
          'job_title', NEW.title,
          'job_description', COALESCE(NEW.description, ''),
          'job_budget', NEW.budget,
          'job_location', NEW.location,
          'job_id', NEW.id,
          'notification_id', notification.id
        ),
        'application/json',
        jsonb_build_object(
          'Authorization', auth_header,
          'Content-Type', 'application/json'
        ),
        2000
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the trigger
      RAISE WARNING 'Error calling send-job-notification function: %', SQLERROR_MESSAGE;
    END;

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
-- Step 4: Optional - Add Email Preferences to notification_preferences Table
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

-- Count notifications by status
SELECT
  status,
  COUNT(*) as count
FROM job_notifications
GROUP BY status;

-- Check if trigger is active
SELECT
  trigger_name,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_new_job_create_notifications';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- Disable trigger temporarily:
-- ALTER TABLE jobs DISABLE TRIGGER on_new_job_create_notifications;

-- Re-enable trigger:
-- ALTER TABLE jobs ENABLE TRIGGER on_new_job_create_notifications;

-- Drop trigger and function:
-- DROP TRIGGER on_new_job_create_notifications ON jobs;
-- DROP FUNCTION trigger_send_job_notifications();
