import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const SUPPORT_EMAIL = 'verification@goartisans.online'

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '20mb',
        },
    },
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { userId, userName, userEmail, selfieData, idType, idData } = req.body

    // Basic validation
    if (!userId || !userEmail || !selfieData || !idType || !idData) {
        return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate base64 images
    if (!selfieData.startsWith('data:image/') || !idData.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' })
    }

    // Strip data URI prefix for attachment
    const selfieBase64 = selfieData.split(',')[1]
    const idBase64 = idData.split(',')[1]
    const selfieExt = selfieData.split(';')[0].split('/')[1] || 'jpg'
    const idExt = idData.split(';')[0].split('/')[1] || 'jpg'

    try {
        // Email to support with attachments
        await resend.emails.send({
            from: 'Go Artisans <noreply@goartisans.online>',
            to: SUPPORT_EMAIL,
            subject: `[Verification Request] ${userName} (${userEmail})`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1d4ed8;">New Verification Request</h2>
                    <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                        <tr><td style="padding:8px; font-weight:bold; color:#374151;">User ID</td><td style="padding:8px;">${userId}</td></tr>
                        <tr><td style="padding:8px; font-weight:bold; color:#374151;">Name</td><td style="padding:8px;">${userName}</td></tr>
                        <tr><td style="padding:8px; font-weight:bold; color:#374151;">Email</td><td style="padding:8px;">${userEmail}</td></tr>
                        <tr><td style="padding:8px; font-weight:bold; color:#374151;">ID Type</td><td style="padding:8px;">${idType}</td></tr>
                        <tr><td style="padding:8px; font-weight:bold; color:#374151;">Submitted At</td><td style="padding:8px;">${new Date().toUTCString()}</td></tr>
                    </table>
                    <p style="color:#6b7280; font-size:14px;">Documents are attached to this email. Please review and update the user's verification status in Supabase.</p>
                    <p style="color:#6b7280; font-size:14px;">To approve: set <code>verification_badges.status = 'approved'</code> for user ID above, then send a confirmation email to the user.</p>
                </div>
            `,
            attachments: [
                {
                    filename: `selfie_${userId}.${selfieExt}`,
                    content: selfieBase64,
                    contentType: `image/${selfieExt}`,
                },
                {
                    filename: `id_${idType.replace(/\s+/g, '_').toLowerCase()}_${userId}.${idExt}`,
                    content: idBase64,
                    contentType: `image/${idExt}`,
                },
            ],
        })

        // Confirmation email to user
        await resend.emails.send({
            from: 'Go Artisans <noreply@goartisans.online>',
            to: userEmail,
            subject: 'Your Verification Request Has Been Received',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #1d4ed8;">Verification Request Received</h2>
                    <p>Hi ${userName},</p>
                    <p>We've received your verification documents and our team is reviewing them now.</p>
                    <div style="background:#eff6ff; border-left:4px solid #3b82f6; padding:16px; margin:20px 0; border-radius:4px;">
                        <p style="margin:0; font-weight:bold; color:#1e40af;">What happens next?</p>
                        <ul style="color:#1e3a8a; margin-top:8px;">
                            <li>Our team will review your selfie and ${idType} within <strong>24 hours</strong>.</li>
                            <li>If approved, you'll receive an email confirmation and a <strong>🔵 blue verification badge</strong> will appear on your profile.</li>
                            <li>If additional information is needed, we'll let you know what steps to take.</li>
                        </ul>
                    </div>
                    <p style="color:#6b7280; font-size:13px;">If you have questions, reply to this email or contact us at verification@goartisans.online</p>
                    <p>— The GoArtisans Team</p>
                </div>
            `,
        })

        return res.status(200).json({ success: true })
    } catch (err) {
        console.error('[Verification Email Error]', err)
        return res.status(500).json({ error: 'Failed to send verification request' })
    }
}
