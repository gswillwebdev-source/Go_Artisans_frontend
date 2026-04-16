# Email Deliverability Guide - Go Artisans

## Overview
To prevent reset password emails from going to spam folders, you need to configure email authentication records and Supabase settings.

---

## Step 1: Configure DNS Records (REQUIRED)

Add these DNS records to your domain `goartisans.online` via your domain registrar or DNS provider:

### A. SPF Record (Sender Policy Framework)
**Type**: TXT
**Name**: `@` (or `goartisans.online`)
**Value**:
```
v=spf1 include:sendgrid.net include:supabase.com ~all
```

**What it does**: Tells email providers which servers are authorized to send emails from your domain.

---

### B. DKIM Record (DomainKeys Identified Mail)
**Type**: TXT
**Name**: `default._domainkey` (or ask Supabase for specific name)
**Value**: Get from Supabase Dashboard:

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Email Templates**
3. Look for **Email Sending Domain** section
4. Supabase will provide a DKIM public key
5. Add it to DNS as a TXT record

**What it does**: Digitally signs emails to prove they come from your domain.

---

### C. DMARC Record (Domain-based Message Authentication)
**Type**: TXT
**Name**: `_dmarc`
**Value**:
```
v=DMARC1; p=quarantine; rua=mailto:admin@goartisans.online; ruf=mailto:admin@goartisans.online; fo=1
```

**What it does**: Tells email providers what to do with emails that fail SPF/DKIM checks.

---

## Step 2: Configure Supabase Email Settings

1. **Add Custom Email Domain**:
   - Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
   - Look for **Email Sending Domain**
   - Enter: `goartisans.online`
   - Verify DNS records are in place

2. **Set Email Sending Address**:
   - Use: `noreply@goartisans.online` or `support@goartisans.online`
   - This should match your domain for authentication

3. **Configure Email OTP Expiry**:
   - Go to **Authentication** → **Settings**
   - Set **Email OTP Expiry** to: `1800` (30 minutes)
   - ✅ Already set in your migration

---

## Step 3: Verify Email Configuration

After adding DNS records (wait 24-48 hours for propagation):

1. **Test SPF**:
   ```
   dig goartisans.online TXT
   ```
   Should include: `include:sendgrid.net include:supabase.com`

2. **Test DKIM**:
   ```
   dig default._domainkey.goartisans.online TXT
   ```
   Should return your DKIM public key

3. **Test DMARC**:
   ```
   dig _dmarc.goartisans.online TXT
   ```
   Should return your DMARC policy

4. **Use Online Validators**:
   - MXToolbox: https://mxtoolbox.com/spf.aspx
   - Check: Domain, SPF, DKIM, DMARC

---

## Step 4: Email Best Practices

In your frontend code (`frontend/app/forgot-password/page.js`):

### Current Implementation ✅
```javascript
const { error: resetError } = await supabase.auth.resetPasswordForEmail(
    email.trim(),
    { redirectTo: getResetPasswordRedirectUrl() }
)
```

### Best Practices Already Implemented
- ✅ Using Supabase's official email service (trusted sender)
- ✅ Short email address (no spam triggers)
- ✅ Clear redirect URL
- ✅ Standard reset link format

### Additional Recommendations
1. **Subject Line**: Keep it simple and professional
   - ✅ Supabase uses: "Reset your password"
   - Avoid: "URGENT", "CLICK NOW", "ACT NOW" (spam triggers)

2. **Email Content**: Supabase templates are already optimized
   - Plain text + HTML alternatives
   - Clear call-to-action button
   - Unsubscribe link (if applicable)

3. **Timing**: Send immediately (no delays)
   - ✅ Current implementation sends immediately

4. **From Address**: Should match domain
   - Configure in Supabase: `noreply@goartisans.online`

---

## Step 5: Monitor Delivery

### Check Email Reputation
- **SenderScore**: https://www.senderscore.org/
- **Google Postmaster Tools**: https://postmaster.google.com/
- **Microsoft SNDS**: https://postmaster.microsoft.com/

### Check Bounce/Complaint Rates
- Go to **Supabase Dashboard** → **Email Activity**
- Monitor delivery metrics

---

## Troubleshooting

### Emails Still Going to Spam?

1. **Check IP Reputation**:
   - Supabase sends from shared IPs
   - Wait 48 hours after DNS setup for reputation to improve

2. **Review Email Content**:
   - Avoid images in plain text
   - Avoid suspicious links
   - Use HTTPS links only

3. **Use Custom SMTP (Advanced)**:
   - SendGrid, Mailgun, AWS SES
   - Gives you dedicated IP for better reputation
   - Configure in Supabase **Authentication** → **SMTP Content**

4. **Contact Supabase Support**:
   - If IP is blacklisted, escalate to Supabase support

---

## Quick Checklist

- [ ] Add SPF record to DNS
- [ ] Add DKIM record to DNS
- [ ] Add DMARC record to DNS
- [ ] Configure custom domain in Supabase
- [ ] Wait 24-48 hours for DNS propagation
- [ ] Verify DNS records with online tools
- [ ] Test password reset email
- [ ] Monitor delivery with Postmaster tools

---

## Current Setup Summary

**Project**: Go Artisans
**Domain**: `goartisans.online`
**Email Service**: Supabase Auth
**Reset Link Expiry**: 30 minutes
**Trigger**: `check_password_reset_eligibility()` RPC
**Rate Limit**: 14-day cooldown per user
