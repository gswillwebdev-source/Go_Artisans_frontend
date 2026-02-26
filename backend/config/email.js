const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
})

const sendVerificationCode = async (email, code) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Email Verification Code - JobSeek',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #4F46E5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">JobSeek</h1>
                </div>
                <div style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1f2937; margin-bottom: 10px;">Verify Your Email Address</h2>
                    <p style="color: #6b7280; margin-bottom: 20px;">Thank you for signing up! Please verify your email address using the code below:</p>
                    <div style="background-color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                        <p style="color: #999; font-size: 14px; margin-bottom: 10px;">Your verification code is:</p>
                        <h1 style="color: #4F46E5; font-size: 48px; letter-spacing: 8px; margin: 0; font-weight: bold;">${code}</h1>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">This code expires in 15 minutes.</p>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't create this account, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">JobSeek Team</p>
                </div>
            </div>
        `
    }
    return transporter.sendMail(mailOptions)
}

const sendPasswordResetLink = async (email, resetToken) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset Request - JobSeek',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #4F46E5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">JobSeek</h1>
                </div>
                <div style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1f2937; margin-bottom: 10px;">Password Reset Request</h2>
                    <p style="color: #6b7280; margin-bottom: 20px;">We received a request to reset your password. Click the button below to set a new password:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link in your browser:</p>
                    <p style="color: #4F46E5; font-size: 12px; word-break: break-all;">${resetLink}</p>
                    <p style="color: #6b7280; font-size: 14px;">This link expires in 1 hour.</p>
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you didn't request this, you can safely ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">JobSeek Team</p>
                </div>
            </div>
        `
    }
    return transporter.sendMail(mailOptions)
}

module.exports = { sendVerificationCode, sendPasswordResetLink }
