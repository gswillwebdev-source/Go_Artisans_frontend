# Option A Setup - Quick Checklist

## Prerequisites
- ✅ You already have password reset working in Supabase
- ✅ You have the job notification system set up (job_alerts, job_notifications tables)
- ✅ Jobs are being matched to alerts via SQL trigger

## What to Do Now

### 1. **Choose Email Service** (5 minutes)
- [ ] SendGrid (https://sendgrid.com) - Free tier: 100 emails/day
- [ ] Resend (https://resend.com) - Free tier: 100 emails/day

Get your **API Key** from the service dashboard.

### 2. **Run SQL Commands in Supabase** (5 minutes)
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy-paste ALL commands from `SUPABASE_SQL_COMMANDS_FOR_EMAIL.sql`
4. Click "Run"

**What this does:**
- ✅ Enables `http` extension (for calling Edge Function from Postgres)
- ✅ Adds `email_sent` and `email_sent_at` columns
- ✅ Updates trigger to call Edge Function when jobs are created
- ✅ Adds optional email preferences

### 3. **Create Supabase Edge Function** (10 minutes)
1. Open terminal/git bash
2. Navigate to your project root
3. Run:
```bash
supabase functions new send-job-notification
```

4. Copy-paste the TypeScript code from `SUPABASE_JOB_NOTIFICATIONS_EMAIL_SETUP.md` Step 2 into:
   - File: `supabase/functions/send-job-notification/index.ts`

5. Create deno.json in the function folder (if not auto-created):
```json
{
  "imports": {
    "https://": "https://",
    "deno.land": "https://deno.land"
  }
}
```

### 4. **Set Environment Variables in Supabase** (2 minutes)
1. Supabase Dashboard → Project Settings → Edge Functions
2. Click "Add secret"
3. Add ONE of these:
   - **For SendGrid:** Key = `SENDGRID_API_KEY`, Value = your SendGrid API key
   - **For Resend:** Key = `RESEND_API_KEY`, Value = your Resend API key

### 5. **Deploy Edge Function** (2 minutes)
In terminal:
```bash
supabase functions deploy send-job-notification
```

Output should show: `✓ Function deployed successfully`

### 6. **Test It** (5 minutes)
1. Log in as a **worker** on your app
2. Go to Job Alerts → Create a new alert with your skills
3. Log in as a **client** (different user)
4. Go to Post Job → Create a job matching the worker's skills
5. Check your email for notification (check spam folder too!)

---

## All SQL You Need to Run

Found in: `SUPABASE_SQL_COMMANDS_FOR_EMAIL.sql`

```sql
-- 1. Enable HTTP extension
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Add email tracking columns
ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

ALTER TABLE job_notifications
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMP DEFAULT NULL;

-- 3. Create trigger (full trigger code in SQL file)
-- See SUPABASE_SQL_COMMANDS_FOR_EMAIL.sql for complete trigger function
```

---

## No Additional Files to Create

✅ Your existing files still work:
- `frontend/app/job-alerts/page.js` - Still works for creating alerts
- `frontend/app/notifications/page.js` - Shows notifications (now with email sent!)
- `SUPABASE_JOB_ALERTS_MIGRATION.sql` - Already has the basic job_alerts setup

---

## What Happens After Setup

**Flow:**
1. Worker creates job alert (saves to `job_alerts` table)
2. Client posts a job
3. Postgres trigger runs automatically
4. SQL function matches job to alerts
5. **NEW:** Creates notification in `job_notifications`
6. **NEW:** Calls Supabase Edge Function
7. **NEW:** Edge Function sends email via SendGrid/Resend
8. **NEW:** Marks `email_sent = TRUE` when done

---

## Monitoring

Check email sending in Supabase:

```sql
-- See recent notifications with email status
SELECT jn.id, j.title, u.email, jn.email_sent, jn.email_sent_at
FROM job_notifications jn
JOIN jobs j ON jn.job_id = j.id
JOIN users u ON jn.worker_id = u.id
ORDER BY jn.created_at DESC
LIMIT 10;
```

---

## If Emails Don't Arrive

1. **Check Edge Function logs:**
```bash
supabase functions logs send-job-notification
```

2. **Verify API key is in Supabase:**
   - Dashboard → Settings → Functions → Secrets
   - Check `SENDGRID_API_KEY` or `RESEND_API_KEY` exists

3. **Check SendGrid/Resend:**
   - Is the sender email verified?
   - Is API key valid?

4. **Check spam folder** - Possible email goes to junk

5. **Verify http extension is enabled:**
```sql
SELECT * FROM pg_available_extensions WHERE name = 'http';
```

---

## Time Estimate
- Email service setup: 5 min
- Supabase SQL: 5 min
- Edge Function: 10 min
- Environment variables: 2 min
- Deploy: 2 min
- Test: 5 min
- **Total: ~30 minutes**

---

## Next Steps After This Works

Optional improvements:
- Add email frequency options (immediate vs daily digest)
- Add email preference toggle in NotificationPreferencesModal
- Set up email analytics dashboard in SendGrid
- Add retry logic if email fails
