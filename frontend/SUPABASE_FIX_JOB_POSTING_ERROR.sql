-- ============================================================================
-- FIX: Job Posting Error - REPLACE() function with JSONB
-- ============================================================================
-- This fixes the "function replace(jsonb, unknown, unknown) does not exist" error
-- when posting a new job
--
-- The issue: Trigger functions were trying to use REPLACE() on JSONB skills column
-- Solution: Properly handle JSONB array by casting to TEXT or using JSONB functions
-- ============================================================================

-- Drop the old broken trigger and function
DROP TRIGGER IF EXISTS on_new_job_create_notifications ON jobs;
DROP FUNCTION IF EXISTS trigger_send_job_notifications() CASCADE;

-- Create corrected trigger function
CREATE OR REPLACE FUNCTION trigger_send_job_notifications()
RETURNS TRIGGER AS $$
DECLARE
  alert RECORD;
  notification RECORD;
BEGIN
  FOR alert IN
    SELECT
      ja.id as alert_id,
      ja.worker_id,
      ja.skills,
      ja.location as alert_location,
      ja.max_budget,
      ja.notification_frequency
    FROM job_alerts ja
    WHERE
      -- Match skills: check if any alert skill appears in job title or description
      (
        SELECT COUNT(*)
        FROM jsonb_array_elements_text(ja.skills) AS skill
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
      job_alert_id,
      status,
      notification_frequency,
      created_at
    ) VALUES (
      NEW.id,
      alert.worker_id,
      alert.alert_id,
      'new',
      alert.notification_frequency,
      NOW()
    ) RETURNING * INTO notification;

  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_new_job_create_notifications
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_send_job_notifications();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_job_notifications_unsent
ON job_notifications(worker_id, email_sent, notification_frequency);

SELECT 'Job posting trigger fixes applied successfully!' as status;
