# Supabase Email Templates Setup Guide

## Overview

This guide explains how to configure Supabase's built-in email templates for password reset emails and other authentication emails.

---

## Step 1: Access Supabase Email Templates

1. Go to **Supabase Dashboard** → Your Project
2. Click on **Authentication** in the left sidebar
3. Click on **Email Templates** tab
4. You'll see three default email types:
   - **Confirm signup** - Email confirmation for new sign-ups
   - **Invite user** - Invitation emails for invited users
   - **Magic Link** - For passwordless authentication
   - **Reset Password** - Password reset emails
   - **Change Email** - Email change confirmation

---

## Step 2: Customize Reset Password Email Template

This is the email sent when users click "Forgot Password" on your app.

### Current Template (Default)
The default Supabase reset password template includes:
- A button with reset link
- Expiration time (default: 30 minutes)
- Sender: noreply@supabase.com

### To Customize:

1. Click on **Reset Password** template
2. You'll see two sections:
   - **Email Subject** - Change the subject line
   - **Email Body** - Customize the HTML/text content

### Custom Template Example for Go Artisans:

**Subject:**
```
Reset your Go Artisans password
```

**Body:**
```html
<p>Hi,</p>
<p>You requested to reset your password for your Go Artisans account.</p>
<p>Click the button below to reset your password:</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
  Reset Password
</a>
<p style="margin-top: 20px; color: #666; font-size: 12px;">
  This link will expire in 30 minutes.
</p>
<p style="color: #666; font-size: 12px;">
  If you didn't request this, you can safely ignore this email.
</p>
<p style="margin-top: 20px; color: #999; font-size: 11px;">
  Go Artisans - Your trusted marketplace for local skilled workers
</p>
```

### Available Template Variables

- `{{ .ConfirmationURL }}` - The reset link (expires in 30 min)
- `{{ .Email }}` - User's email address
- `{{ .site_name }}` - Your app name (from settings)

---

## Step 3: Set Custom Sender Email & Domain

### Option A: Use Your Own Domain (Recommended for Production)

1. In **Authentication** → **Email Templates**
2. Look for **Sender name** and **From address** settings
3. Set:
   - **Sender Name**: "Go Artisans Support"
   - **From Address**: `noreply@goartisans.online` or `support@goartisans.online`

4. Configure DNS records (for email deliverability):
   - **SPF Record**: `v=spf1 include:sendgrid.net include:supabase.com ~all`
   - **DKIM**: Get from Supabase dashboard and add to DNS
   - **DMARC**: `v=DMARC1; p=quarantine; rua=mailto:admin@goartisans.online`

### Option B: Use Supabase Default (Development)

- Keep `noreply@supabase.com` for testing
- Switch to your domain before production

See `EMAIL_DELIVERABILITY_GUIDE.md` for full DNS setup.

---

## Step 4: Email Header Configuration

In **Authentication** settings:

1. **Email OTP Expiry**: Set to `1800` seconds (30 minutes) ✓ Already configured
2. **Sender Name**: `Go Artisans` or `Go Artisans Support`
3. **Subject Line Prefix**: (Optional) Add "[Go Artisans]" to all emails

---

## Step 5: Test Email Template

### Manually Test Reset Password:

1. Log out of your app
2. Go to `/forgot-password` page
3. Enter an email address that exists in Supabase
4. You should receive an email in your inbox (or spam folder)
5. Check if:
   - Email arrives within 30 seconds
   - Subject line is correct
   - Email body looks good
   - Reset link works

### If Email Goes to Spam:

- Check spam/junk folder
- Verify DNS records are configured (see `EMAIL_DELIVERABILITY_GUIDE.md`)
- Wait 24-48 hours for DNS propagation

---

## Step 6: Customize Other Email Templates (Optional)

### Confirm Signup Email
Sent when new user signs up:

**Subject:**
```
Confirm your email - Go Artisans
```

**Body:**
```html
<p>Welcome to Go Artisans!</p>
<p>Click the button below to confirm your email:</p>
<a href="{{ .ConfirmationURL }}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
  Confirm Email
</a>
```

### Magic Link Email (Passwordless Login)
If you implement passwordless auth:

**Subject:**
```
Your Go Artisans login link
```

**Body:**
```html
<p>Click the link below to log in to Go Artisans:</p>
<a href="{{ .ConfirmationURL }}">
  Log In to Go Artisans
</a>
<p style="color: #666; font-size: 12px; margin-top: 20px;">
  This link will expire in 10 minutes.
</p>
```

---

## Step 7: Job Notification Emails (Optional)

For job alert/notification emails, you have two options:

### Option A: Supabase Functions + SendGrid/Resend (Recommended)

Create a Supabase Edge Function to send job notification emails:

```javascript
// supabase/functions/send-job-notification/index.ts
import { Resend } from 'resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

Deno.serve(async (req) => {
  const { worker_email, job_title, job_description } = await req.json()

  const response = await resend.emails.send({
    from: 'noreply@goartisans.online',
    to: worker_email,
    subject: `New Job Match: ${job_title}`,
    html: `
      <h2>New Job Opportunity!</h2>
      <p><strong>${job_title}</strong></p>
      <p>${job_description}</p>
      <a href="https://goartisans.online/notifications"
         style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
        View Job
      </a>
    `
  })

  return new Response(JSON.stringify(response), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Deploy with:
```bash
supabase functions deploy send-job-notification
```

### Option B: Use Existing Backend Email Service

Keep using your current email setup (Gmail + Nodemailer) for job notifications. The Supabase Auth emails (password reset) will use Supabase templates, and job notification emails will use your backend service.

---

## Step 8: Production Checklist

Before deploying to production:

- [ ] DNS records configured (SPF, DKIM, DMARC)
- [ ] Custom sender email set to `noreply@goartisans.online`
- [ ] Email templates customized with your branding
- [ ] Test password reset email path
- [ ] Test job notification email path
- [ ] Monitor email deliverability (see next section)

---

## Step 9: Monitor Email Deliverability

### Tools to Check:

1. **MXToolbox** (https://mxtoolbox.com)
   - Check SPF, DKIM, DMARC records
   - Verify email domain reputation

2. **Google Postmaster Tools** (https://postmaster.google.com)
   - Monitor Gmail delivery rates
   - Check authentication status

3. **Microsoft SNDS** (https://postmaster.microsoft.com)
   - Monitor Outlook/Exchange delivery

### Check These Metrics:

- ✅ SPF: Pass
- ✅ DKIM: Pass
- ✅ DMARC: Pass
- ✅ IP Reputation: Green
- ✅ Domain Reputation: Good

If any are failing, emails may go to spam.

---

## Step 10: Email Template Variables Reference

### Available in All Emails:
- `{{ .Email }}` - User's email
- `{{ .ConfirmationURL }}` - Action URL

### Reset Password Specific:
- `{{ .SiteURL }}` - Your app's base URL
- `{{ .ConfirmationURL }}` - The reset link

### Signup Confirmation Specific:
- `{{ .ConfirmationURL }}` - Email verification link

---

## Troubleshooting

### Emails Not Arriving

**Check:**
1. Is the email in the spam/junk folder?
2. DNS records configured? (SPF, DKIM, DMARC)
3. Is the email bouncing? (Check Supabase logs)
4. Is the user's email address correct?

**Solution:**
```bash
# Check Supabase logs for email errors
supabase functions logs send-job-notification
```

### Email Going to Spam

**Cause:** DNS records not configured
**Solution:** Add SPF, DKIM, DMARC records (see Step 3)

### Template Not Showing

**Cause:** Missing template variables
**Solution:** Use correct variable names (e.g., `{{ .ConfirmationURL }}` not `{confirmationUrl}`)

---

## Summary

✅ **Password Reset Emails**: Configured via Supabase Auth → Email Templates
✅ **Custom Branding**: Set sender, subject, and HTML body
✅ **Domain Setup**: Use `goartisans.online` with DNS records
✅ **Job Notification Emails**: Use Supabase Functions or existing backend
✅ **Deliverability Monitoring**: Use MXToolbox, Postmaster Tools

Your email system is now configured to send professional, branded emails from Go Artisans!

---

## Links & Resources

- Supabase Email Documentation: https://supabase.com/docs/guides/auth/auth-email-templates
- SPF/DKIM/DMARC Guide: `EMAIL_DELIVERABILITY_GUIDE.md`
- Job Notification System: `SUPABASE_NATIVE_SETUP.md`
