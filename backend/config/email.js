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
        subject: 'Password Reset Verification Code',
        html: `
            <h2>Password Reset Request</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px;">${code}</h1>
            <p>This code expires in 10 minutes.</p>
            <p>If you didn't request this, ignore this email.</p>
        `
    }
    return transporter.sendMail(mailOptions)
}

module.exports = { sendVerificationCode }