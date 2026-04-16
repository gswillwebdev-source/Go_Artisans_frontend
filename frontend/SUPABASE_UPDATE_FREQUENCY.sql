-- ADD EMAIL FREQUENCY COLUMN TO JOB_NOTIFICATIONS TABLE

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS notification_frequency VARCHAR DEFAULT 'immediate';

-- UPDATE TRIGGER TO STORE FREQUENCY FROM JOB_ALERTS

DROP TRIGGER IF EXISTS on_new_job_create_notifications ON jobs;
DROP FUNCTION IF EXISTS trigger_send_job_notifications() CASCADE;

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

-- CREATE TRIGGER
CREATE TRIGGER on_new_job_create_notifications
AFTER INSERT ON jobs
FOR EACH ROW
EXECUTE FUNCTION trigger_send_job_notifications();

-- CREATE INDEX FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_job_notifications_unsent
ON job_notifications(worker_id, email_sent, notification_frequency);
