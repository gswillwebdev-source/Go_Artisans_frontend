import { Resend } from 'resend'

const FROM_EMAIL = 'Go Artisans <noreply@goartisans.online>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://goartisans.online'

// ─── Email HTML scaffold ────────────────────────────────────────────────────

function emailWrapper(previewText, bodyHtml) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${previewText}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr>
        <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Go Artisans</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Your Local Services Platform</p>
        </td>
      </tr>
      <tr>
        <td style="padding:40px 40px 32px;">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} Go Artisans. All rights reserved.</p>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:12px;">This is an automated notification — please do not reply.</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function btn(label, url) {
    return `<table cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
  <tr><td style="background:#4f46e5;border-radius:8px;">
    <a href="${url}" target="_blank" style="display:inline-block;padding:13px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${label} →</a>
  </td></tr>
</table>`
}

function infoBox(color, borderColor, content) {
    return `<div style="background:${color};border:1px solid ${borderColor};border-radius:8px;padding:16px 20px;margin:20px 0;">${content}</div>`
}

// ─── Template 1: Welcome ────────────────────────────────────────────────────

function buildWelcomeEmail(user) {
    const isWorker = user.user_type === 'worker'
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">Welcome, ${user.first_name}! 👋</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.7;">
        We're thrilled to have you on <strong style="color:#374151;">Go Artisans</strong> — the platform connecting skilled local professionals with people who need quality work done.
      </p>
      ${isWorker ? `
      <p style="margin:0 0 10px;color:#374151;font-size:15px;font-weight:600;">Here's how to get started as a Worker:</p>
      ${infoBox('#eff6ff', '#bfdbfe', `
        <p style="margin:0 0 6px;color:#1e40af;font-size:14px;font-weight:600;">Quick-start checklist</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">✓ Add a professional profile photo</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">✓ Write a bio describing your skills and experience</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">✓ Set your location so nearby clients can find you</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">✓ Browse jobs and send your first proposal</p>
      `)}
      ${btn('Complete My Profile', `${APP_URL}/worker-profile`)}
      ` : `
      <p style="margin:0 0 10px;color:#374151;font-size:15px;font-weight:600;">Here's how to get started as a Client:</p>
      ${infoBox('#f0fdf4', '#bbf7d0', `
        <p style="margin:0 0 6px;color:#166534;font-size:14px;font-weight:600;">Quick-start checklist</p>
        <p style="margin:3px 0;color:#166534;font-size:13px;">✓ Post a job with a clear description and budget</p>
        <p style="margin:3px 0;color:#166534;font-size:13px;">✓ Review proposals from skilled local workers</p>
        <p style="margin:3px 0;color:#166534;font-size:13px;">✓ Hire the best fit and manage everything in one place</p>
      `)}
      ${btn('Post My First Job', `${APP_URL}/jobs`)}
      `}
    `
    return emailWrapper(`Welcome to Go Artisans, ${user.first_name}!`, body)
}

// ─── Template 2: Profile completion reminder ────────────────────────────────

function buildProfileReminderEmail(user) {
    const isWorker = user.user_type === 'worker'
    const missing = []
    if (!user.bio) missing.push('Bio / About you')
    if (!user.location) missing.push('Location')
    if (!user.phone_number) missing.push('Phone number')
    if (!user.profile_picture) missing.push('Profile photo')

    const profileUrl = `${APP_URL}/${isWorker ? 'worker-profile' : 'profile'}`
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">Your profile is incomplete, ${user.first_name}</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.7;">
        Profiles with complete information receive <strong style="color:#374151;">significantly more visibility</strong> in search results. You're missing a few key details that clients look for:
      </p>
      ${infoBox('#fefce8', '#fde047', `
        <p style="margin:0 0 8px;color:#854d0e;font-size:14px;font-weight:600;">Missing from your profile:</p>
        ${missing.map(f => `<p style="margin:3px 0;color:#854d0e;font-size:13px;">⚠️ ${f}</p>`).join('')}
      `)}
      <p style="margin:16px 0 0;color:#6b7280;font-size:14px;line-height:1.6;">
        ${isWorker
            ? 'Clients filter workers by location and services — without these, you won\'t appear in their searches.'
            : 'Workers trust clients with complete profiles and respond faster to their job posts.'}
      </p>
      ${btn('Update My Profile', profileUrl)}
    `
    return emailWrapper('Complete your Go Artisans profile', body)
}

// ─── Template 3: No applications yet (worker) ───────────────────────────────

function buildNoApplicationsEmail(user) {
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">Ready to land your first job? 💼</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.7;">
        Hi <strong>${user.first_name}</strong>, you've joined Go Artisans but haven't applied to any jobs yet. Clients in your area are actively looking for skilled professionals like you.
      </p>
      ${infoBox('#ecfdf5', '#6ee7b7', `
        <p style="margin:0 0 8px;color:#065f46;font-size:14px;font-weight:600;">Tips to win your first job:</p>
        <p style="margin:3px 0;color:#065f46;font-size:13px;">✓ Upload a professional photo — it builds instant trust</p>
        <p style="margin:3px 0;color:#065f46;font-size:13px;">✓ Personalize each proposal to the specific job</p>
        <p style="margin:3px 0;color:#065f46;font-size:13px;">✓ Mention your relevant experience upfront</p>
        <p style="margin:3px 0;color:#065f46;font-size:13px;">✓ Offer a fair, competitive price</p>
      `)}
      ${btn('Browse Available Jobs', `${APP_URL}/jobs`)}
    `
    return emailWrapper('Land your first job on Go Artisans', body)
}

// ─── Template 4: Application accepted ──────────────────────────────────────

function buildAppAcceptedEmail(user, job) {
    const jobTitle = job?.title || 'a job'
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">🎉 You've been accepted!</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.7;">
        Great news, <strong>${user.first_name}</strong>! Your proposal for <strong style="color:#374151;">"${jobTitle}"</strong> was accepted by the client. Time to get to work!
      </p>
      ${infoBox('#eff6ff', '#bfdbfe', `
        <p style="margin:0 0 8px;color:#1e40af;font-size:14px;font-weight:600;">Next steps:</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">1. Message the client to confirm start date and details</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">2. Agree on a clear timeline and deliverables</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">3. Complete the work to the highest standard</p>
        <p style="margin:3px 0;color:#1e40af;font-size:13px;">4. Mark the job as complete when finished</p>
      `)}
      ${btn('View My Jobs', `${APP_URL}/worker`)}
    `
    return emailWrapper('Your application was accepted!', body)
}

// ─── Template 5: Review request ─────────────────────────────────────────────

function buildReviewRequestEmail(user, job, role) {
    const jobTitle = job?.title || 'your recent job'
    const otherRole = role === 'worker' ? 'client' : 'worker'
    const url = `${APP_URL}/${role === 'worker' ? 'worker' : 'jobs'}`
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">How did it go, ${user.first_name}? ⭐</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.7;">
        The job <strong style="color:#374151;">"${jobTitle}"</strong> has been completed and confirmed. Your honest review helps the ${otherRole} build their reputation and helps the community make better decisions.
      </p>
      ${infoBox('#fdf4ff', '#e9d5ff', `
        <p style="margin:0;color:#6b21a8;font-size:14px;line-height:1.6;">
          ⭐ It takes less than 30 seconds to leave a review — and it makes a real difference for the people you worked with.
        </p>
      `)}
      ${btn('Leave a Review', url)}
    `
    return emailWrapper(`Leave a review for "${jobTitle}"`, body)
}

// ─── Template 6: Re-engagement ──────────────────────────────────────────────

function buildReEngagementEmail(user) {
    const isWorker = user.user_type === 'worker'
    const body = `
      <h2 style="margin:0 0 12px;color:#111827;font-size:22px;font-weight:700;">We miss you, ${user.first_name}! 👋</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:15px;line-height:1.7;">
        It's been a while since you last visited Go Artisans. ${isWorker
            ? 'New jobs are posted every day — there could be an opportunity perfect for your skills right now.'
            : 'Looking for a skilled professional? Browse our workers and get your project started today.'}
      </p>
      ${isWorker ? `
      ${infoBox('#fef3c7', '#fcd34d', `
        <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
          💡 <strong>Tip:</strong> Updating your profile — even just your bio — boosts your visibility in search results.
        </p>
      `)}
      ${btn('Browse New Jobs', `${APP_URL}/jobs`)}
      ` : `
      ${infoBox('#f0fdf4', '#bbf7d0', `
        <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
          💡 Post a job for free — skilled local professionals will send you proposals within hours.
        </p>
      `)}
      ${btn('Find a Professional', `${APP_URL}/browse-workers`)}
      `}
    `
    return emailWrapper(`Come back to Go Artisans, ${user.first_name}!`, body)
}

// ─── Campaign runner ─────────────────────────────────────────────────────────

export async function runEmailCampaigns(adminClient) {
    const resendClient = new Resend(process.env.RESEND_API_KEY)
    const now = new Date()
    const results = { sent: 0, failed: 0, skipped: 0, details: [] }

    async function alreadySent(userId, emailType, referenceId = null, withinDays = null) {
        let q = adminClient.from('email_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('email_type', emailType)
        if (referenceId) q = q.eq('reference_id', referenceId)
        if (withinDays) {
            const since = new Date(now - withinDays * 24 * 60 * 60 * 1000).toISOString()
            q = q.gte('sent_at', since)
        }
        const { data } = await q.limit(1)
        return (data?.length || 0) > 0
    }

    async function send(toEmail, subject, html, userId, emailType, referenceId = null) {
        try {
            await resendClient.emails.send({ from: FROM_EMAIL, to: toEmail, subject, html })
            const logEntry = { user_id: userId, email_type: emailType }
            if (referenceId) logEntry.reference_id = referenceId
            await adminClient.from('email_logs').insert(logEntry)
            results.sent++
            results.details.push({ type: emailType, to: toEmail, status: 'sent' })
        } catch (err) {
            results.failed++
            results.details.push({ type: emailType, to: toEmail, status: 'failed', error: err.message })
            console.error(`Email send failed [${emailType}] to ${toEmail}:`, err.message)
        }
    }

    const DAY = 24 * 60 * 60 * 1000
    const twoDaysAgo = new Date(now - 2 * DAY).toISOString()
    const threeDaysAgo = new Date(now - 3 * DAY).toISOString()
    const sevenDaysAgo = new Date(now - 7 * DAY).toISOString()
    const thirtyDaysAgo = new Date(now - 30 * DAY).toISOString()

    // ── 1. Welcome — new users in last 48 h ─────────────────────────────────
    const { data: newUsers } = await adminClient.from('users')
        .select('id, email, first_name, user_type')
        .gte('created_at', twoDaysAgo)
        .neq('user_type', 'admin')
        .limit(100)

    for (const u of newUsers || []) {
        if (await alreadySent(u.id, 'welcome')) { results.skipped++; continue }
        await send(u.email, `Welcome to Go Artisans, ${u.first_name}!`, buildWelcomeEmail(u), u.id, 'welcome')
    }

    // ── 2. Profile reminder — registered 3+ days ago, still incomplete ──────
    const { data: incompleteUsers } = await adminClient.from('users')
        .select('id, email, first_name, user_type, bio, location, phone_number, profile_picture')
        .lte('created_at', threeDaysAgo)
        .neq('user_type', 'admin')
        .or('bio.is.null,bio.eq.,location.is.null,location.eq.,phone_number.is.null')
        .limit(200)

    for (const u of incompleteUsers || []) {
        if (await alreadySent(u.id, 'profile_reminder', null, 30)) { results.skipped++; continue }
        await send(
            u.email,
            'Complete your Go Artisans profile for more visibility',
            buildProfileReminderEmail(u),
            u.id, 'profile_reminder'
        )
    }

    // ── 3. No applications — worker, 3+ days old, never applied ─────────────
    const { data: allWorkers } = await adminClient.from('users')
        .select('id, email, first_name')
        .eq('user_type', 'worker')
        .lte('created_at', threeDaysAgo)
        .limit(300)

    const { data: appliedRows } = await adminClient.from('applications')
        .select('worker_id')
        .limit(5000)

    const appliedSet = new Set((appliedRows || []).map(a => a.worker_id))

    for (const u of allWorkers || []) {
        if (appliedSet.has(u.id)) { results.skipped++; continue }
        if (await alreadySent(u.id, 'no_applications', null, 14)) { results.skipped++; continue }
        await send(
            u.email,
            'Ready to land your first job on Go Artisans?',
            buildNoApplicationsEmail(u),
            u.id, 'no_applications'
        )
    }

    // ── 4. Application accepted — accepted within last 7 days ───────────────
    const { data: acceptedApps } = await adminClient.from('applications')
        .select('id, worker_id, job_id')
        .eq('status', 'accepted')
        .gte('updated_at', sevenDaysAgo)
        .limit(100)

    if ((acceptedApps || []).length > 0) {
        const workerIds = [...new Set(acceptedApps.map(a => a.worker_id))]
        const jobIds = [...new Set(acceptedApps.map(a => a.job_id))]

        const [{ data: workerUsers }, { data: jobsList }] = await Promise.all([
            adminClient.from('users').select('id, email, first_name').in('id', workerIds),
            adminClient.from('jobs').select('id, title').in('id', jobIds),
        ])
        const wMap = Object.fromEntries((workerUsers || []).map(u => [u.id, u]))
        const jMap = Object.fromEntries((jobsList || []).map(j => [j.id, j]))

        for (const app of acceptedApps) {
            const u = wMap[app.worker_id]
            if (!u) continue
            if (await alreadySent(u.id, 'app_accepted', app.id)) { results.skipped++; continue }
            const job = jMap[app.job_id]
            await send(
                u.email,
                `🎉 Your application${job?.title ? ` for "${job.title}"` : ''} was accepted!`,
                buildAppAcceptedEmail(u, job),
                u.id, 'app_accepted', app.id
            )
        }
    }

    // ── 5. Review request — confirmed completions in last 7 days ────────────
    const { data: confirmedCompletions } = await adminClient.from('completions')
        .select('id, job_id, worker_id, client_id')
        .eq('status', 'confirmed')
        .gte('created_at', sevenDaysAgo)
        .limit(100)

    if ((confirmedCompletions || []).length > 0) {
        const allUids = [...new Set([
            ...confirmedCompletions.map(c => c.worker_id),
            ...confirmedCompletions.map(c => c.client_id),
        ])]
        const jIds = [...new Set(confirmedCompletions.map(c => c.job_id))]

        const [{ data: compUsers }, { data: compJobs }] = await Promise.all([
            adminClient.from('users').select('id, email, first_name, user_type').in('id', allUids),
            adminClient.from('jobs').select('id, title').in('id', jIds),
        ])
        const cuMap = Object.fromEntries((compUsers || []).map(u => [u.id, u]))
        const cjMap = Object.fromEntries((compJobs || []).map(j => [j.id, j]))

        for (const c of confirmedCompletions) {
            const job = cjMap[c.job_id]
            const worker = cuMap[c.worker_id]
            const client = cuMap[c.client_id]

            if (worker && !(await alreadySent(worker.id, 'review_request', c.id))) {
                await send(
                    worker.email,
                    `How did "${job?.title || 'your job'}" go? Leave a review`,
                    buildReviewRequestEmail(worker, job, 'worker'),
                    worker.id, 'review_request', c.id
                )
            } else { results.skipped++ }

            if (client && !(await alreadySent(client.id, 'review_request_client', c.id))) {
                await send(
                    client.email,
                    `Rate your experience — "${job?.title || 'your job'}" is complete`,
                    buildReviewRequestEmail(client, job, 'client'),
                    client.id, 'review_request_client', c.id
                )
            } else { results.skipped++ }
        }
    }

    // ── 6. Re-engagement — no activity for 7+ days (but joined < 30 days ago) ─
    const { data: inactiveUsers } = await adminClient.from('users')
        .select('id, email, first_name, user_type')
        .neq('user_type', 'admin')
        .lte('updated_at', sevenDaysAgo)
        .gte('created_at', thirtyDaysAgo)
        .limit(200)

    for (const u of inactiveUsers || []) {
        if (await alreadySent(u.id, 're_engagement', null, 30)) { results.skipped++; continue }
        await send(
            u.email,
            `We miss you on Go Artisans, ${u.first_name}!`,
            buildReEngagementEmail(u),
            u.id, 're_engagement'
        )
    }

    return results
}
