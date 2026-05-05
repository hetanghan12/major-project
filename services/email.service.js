/**
 * Email Service
 * =============
 * Handles sending automated emails for file sharing and system alerts.
 * Uses Nodemailer with Gmail SMTP as the default provider.
 */

const nodemailer = require('nodemailer');

// Configure the transporter
// Note: User will need to provide GMAIL_USER and GMAIL_APP_PASSWORD in .env
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

/**
 * Send a notification email when a file is shared
 * 
 * @param {Object} params - { recipientEmail, ownerEmail, fileName, resourceType, permission, message }
 */
async function sendShareEmail({ recipientEmail, ownerEmail, fileName, resourceType, permission, message = null }) {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.warn('⚠️ Email credentials missing in .env. Skipping share email.');
        return false;
    }

    const subject = `${ownerEmail} shared a ${resourceType} with you on Cloud Space`;
    
    // Create professional HTML email body
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded: 8px;">
            <div style="text-align: center; padding-bottom: 20px;">
                <h1 style="color: #3b82f6;">Cloud Space</h1>
            </div>
            <div style="padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <p style="font-size: 16px; color: #374151;">Hello,</p>
                <p style="font-size: 16px; color: #374151;">
                    <strong>${ownerEmail}</strong> has shared a <strong>${resourceType}</strong> with you:
                </p>
                <div style="margin: 20px 0; padding: 15px; background-color: #ffffff; border-left: 4px solid #3b82f6; border-radius: 4px;">
                    <p style="margin: 0; font-weight: bold; font-size: 18px; color: #111827;">${fileName}</p>
                    <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Access Permission: ${permission}</p>
                </div>
                ${message ? `<p style="font-style: italic; color: #4b5563; padding: 10px; background: #f3f4f6; border-radius: 4px;">"${message}"</p>` : ''}
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:4200'}/dashboard/shared-with-me" 
                       style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                       View in My Files
                    </a>
                </div>
            </div>
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
                This is an automated message from Cloud Space. If you weren't expecting this, you can safely ignore this email.
            </p>
        </div>
    `;

    try {
        const info = await transporter.sendMail({
            from: `"Cloud Space" <${process.env.GMAIL_USER}>`,
            to: recipientEmail,
            subject: subject,
            html: html
        });

        console.log(`📧 Share Email Sent: ${recipientEmail} | MessageID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to send share email:', error.message);
        return false;
    }
}

module.exports = {
    sendShareEmail
};
