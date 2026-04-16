/**
 * Email template for individual job notification
 * @param {Object} data - Template data
 * @returns {string} HTML email content
 */
function jobNotificationEmailTemplate(data) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <!-- Header -->
        <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🔔 New Job Opportunity!</h1>
        </div>

        <!-- Content -->
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${data.workerName},</p>

            <p>We found a job that matches your skills and experience!</p>

            <!-- Job Details -->
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4F46E5;">
                <h2 style="margin-top: 0; color: #1f2937;">${data.jobTitle}</h2>

                <div style="margin: 15px 0;">
                    <strong>📍 Location:</strong> ${data.jobLocation || 'Not specified'}<br>
                    <strong>💰 Budget:</strong> ${data.jobBudget || 'Negotiable'}<br>
                    <strong>🏷️ Alert:</strong> ${data.alertName}
                </div>

                <p><strong>Description:</strong><br>
                ${data.jobDescription}${data.jobDescription?.length >= 200 ? '...' : ''}</p>
            </div>

            <!-- Call to Action Buttons -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.jobUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 0 10px; font-weight: bold;">
                    View Job Details
                </a>
                <a href="${data.preferencesUrl}" style="display: inline-block; background-color: #e5e7eb; color: #374151; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 0 10px; font-weight: bold;">
                    Manage Alerts
                </a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #6b7280;">
                <p>This is an automated notification from Go Artisans. You're receiving this because you have an active job alert matching this opportunity.</p>
                <p><a href="${data.preferencesUrl}" style="color: #4F46E5; text-decoration: none;">Manage your notification preferences</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

/**
 * Email template for digest (multiple jobs)
 * @param {Object} data - Template data
 * @returns {string} HTML email content
 */
function digestEmailTemplate(data) {
    const jobsHTML = data.jobs.map((job, index) => `
        <div style="background-color: #f9fafb; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 3px solid #4F46E5;">
            <h3 style="margin-top: 0; color: #1f2937;">${index + 1}. ${job.title}</h3>
            <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
                <strong>📍</strong> ${job.location || 'Not specified'} |
                <strong>💰</strong> ${job.budget || 'Negotiable'} |
                <strong>🏷️</strong> ${job.alert_name}
            </p>
            <p style="margin: 10px 0; font-size: 14px;">${job.description?.substring(0, 150) || ''}${job.description?.length > 150 ? '...' : ''}</p>
            <a href="${data.jobsUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 8px 15px; text-decoration: none; border-radius: 4px; font-size: 12px; margin-top: 10px;">
                View Job
            </a>
        </div>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
        <!-- Header -->
        <div style="background-color: #4F46E5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">📋 Your ${data.frequency.charAt(0).toUpperCase() + data.frequency.slice(1)} Job Digest</h1>
        </div>

        <!-- Content -->
        <div style="background-color: white; padding: 30px; border-radius: 0 0 8px 8px;">
            <p>Hi ${data.workerName},</p>

            <p>We found <strong>${data.jobs.length}</strong> job${data.jobs.length !== 1 ? 's' : ''} matching your alerts:</p>

            <!-- Jobs List -->
            <div>
                ${jobsHTML}
            </div>

            <!-- View All Button -->
            <div style="text-align: center; margin: 30px 0;">
                <a href="${data.jobsUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    View All Opportunities
                </a>
            </div>

            <!-- Footer -->
            <div style="border-top: 1px solid #e5e7eb; margin-top: 30px; padding-top: 20px; font-size: 12px; color: #6b7280;">
                <p>This is your ${data.frequency} job digest from Go Artisans. You're receiving this because you have active job alerts.</p>
                <p><a href="${data.preferencesUrl}" style="color: #4F46E5; text-decoration: none;">Manage your notification preferences</a></p>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

module.exports = {
    jobNotificationEmailTemplate,
    digestEmailTemplate
};
