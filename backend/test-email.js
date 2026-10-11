const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('📧 Testing email configuration...');
console.log('MAIL_HOST:', process.env.MAIL_HOST);
console.log('MAIL_PORT:', process.env.MAIL_PORT);
console.log('MAIL_USERNAME:', process.env.MAIL_USERNAME);
console.log('MAIL_FROM_ADDRESS:', process.env.MAIL_FROM_ADDRESS);
console.log('MAIL_PASSWORD set:', !!process.env.MAIL_PASSWORD);
console.log('');

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 465,
    secure: Number(process.env.MAIL_PORT) === 465 || process.env.MAIL_ENCRYPTION === 'ssl',
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

async function sendTestEmail() {
    try {
        console.log('🔌 Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        console.log('📨 Sending test email...');
        const info = await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME || 'Jammaila Skin'}" <${process.env.MAIL_FROM_ADDRESS}>`,
            to: process.env.MAIL_FROM_ADDRESS,
            subject: '✅ Test Email - Order Notifications are Working!',
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
                    <h2 style="color: #d63384;">🎉 Email Test Successful!</h2>
                    <p>Hello! This is a test email from your <strong>Jammaila Skin</strong> website.</p>
                    <p>If you received this, it means your order notification emails are working correctly and will be sent to:</p>
                    <p style="font-size: 18px; font-weight: bold; color: #333;">${process.env.MAIL_FROM_ADDRESS}</p>
                    <hr/>
                    <p style="color: #888; font-size: 12px;">Sent from Jammaila Skin backend test script.</p>
                </div>
            `,
        });

        console.log('✅ Test email sent successfully!');
        console.log('📬 Message ID:', info.messageId);
        console.log(`\n👉 Check your inbox at: ${process.env.MAIL_FROM_ADDRESS}`);
    } catch (error) {
        console.error('❌ Email test FAILED!');
        console.error('Error:', error.message);
        if (error.message.includes('Invalid login') || error.message.includes('535')) {
            console.error('\n⚠️  The App Password is wrong or not set up yet.');
            console.error('   Go to: Google Account → Security → 2-Step Verification → App Passwords');
            console.error('   Generate a new App Password and update MAIL_PASSWORD in your .env file.');
        }
    }
}

sendTestEmail();
