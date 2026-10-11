const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    secure: Number(process.env.MAIL_PORT) === 465 || process.env.MAIL_ENCRYPTION === 'ssl', // true for 465 or ssl
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
});

const sendOrderConfirmationEmail = async (order, customerEmail) => {
    if (!process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD || process.env.MAIL_PASSWORD.startsWith('[')) {
        console.warn('SMTP credentials missing, skipping confirmation email.');
        return;
    }

    if (!customerEmail) {
        console.warn('No customer email provided for order', order.id);
        return;
    }

    let itemsHtml = order.items.map(it => `
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${it.productName}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${it.quantity}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₱${Number(it.unitPrice || 0).toFixed(2)}</td>
        </tr>
    `).join('');

    const subtotal = Number(order.subtotal || 0).toFixed(2);
    const shippingFee = Number(order.shippingFee || order.deliveryFee || 0).toFixed(2);
    const total = Number(order.total || 0).toFixed(2);

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #222;">Thank you for your order!</h2>
        <p>Hi ${order.customerName || 'Customer'},</p>
        <p>We have successfully received your order <strong>#${order.id}</strong>. We're getting it ready for shipment.</p>
        
        <h3 style="border-bottom: 2px solid #f0f0f0; padding-bottom: 5px;">Order Details</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
                <tr style="background-color: #f9f9f9;">
                    <th style="padding: 10px; text-align: left;">Product</th>
                    <th style="padding: 10px; text-align: center;">Quantity</th>
                    <th style="padding: 10px; text-align: right;">Price</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
        
        <div style="text-align: right; margin-bottom: 20px;">
            <p style="margin: 5px 0;">Subtotal: <strong>₱${subtotal}</strong></p>
            <p style="margin: 5px 0;">Shipping Fee: <strong>₱${shippingFee}</strong></p>
            <h3 style="margin: 10px 0; font-size: 1.2rem;">Total: <strong>₱${total}</strong></h3>
        </div>
        
        <div style="background-color: #fbf7f3; padding: 15px; border-radius: 6px;">
            <p style="margin: 0;"><strong>Payment Method:</strong> ${order.paymentMethod || 'Cash on Delivery'}</p>
        </div>
        <br/>
        <p>You can track your order using your Order ID or phone number on our website.</p>
        <p>Thank you,<br/>The Cassandra/Jammaila-Skin Team</p>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME || 'Jammaila Skin'}" <${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME}>`,
            to: customerEmail,
            subject: `Order Confirmation - Order #${order.id}`,
            html: htmlContent,
        });
        console.log(`Confirmation email sent to ${customerEmail} for order #${order.id}`);
    } catch (error) {
        console.error('Error sending confirmation email:', error);
    }
};

const sendAdminNotificationEmail = async (order, customerEmail) => {
    if (!process.env.MAIL_USERNAME || !process.env.MAIL_PASSWORD || process.env.MAIL_PASSWORD.startsWith('[')) {
        console.warn('SMTP credentials missing, skipping admin notification email.');
        return;
    }

    let itemsHtml = order.items.map(it => `
        <li>${it.quantity}x ${it.productName} (₱${Number(it.unitPrice || 0).toFixed(2)})</li>
    `).join('');

    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #222;">New Order Received: #${order.id}</h2>
        <p>A new order has been placed on the store.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 20px;">
            <h3 style="margin-top: 0;">Customer Information</h3>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${order.customerName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${customerEmail || 'Not provided'}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${order.phone}</p>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${order.address}</p>
        </div>
        
        <div style="background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; border-radius: 6px;">
            <h3 style="margin-top: 0;">Order Details</h3>
            <ul>
                ${itemsHtml}
            </ul>
            <p><strong>Subtotal:</strong> ₱${Number(order.subtotal || 0).toFixed(2)}</p>
            <p><strong>Shipping:</strong> ₱${Number(order.shippingFee || order.deliveryFee || 0).toFixed(2)}</p>
            <p><strong>Total:</strong> ₱${Number(order.total || 0).toFixed(2)}</p>
            <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        </div>
    </div>
    `;

    try {
        await transporter.sendMail({
            from: `"${process.env.MAIL_FROM_NAME || 'Jammaila Skin'} System" <${process.env.MAIL_FROM_ADDRESS || process.env.MAIL_USERNAME}>`,
            to: 'rhodoralogronio732@gmail.com',
            subject: `New Order Alert - #${order.id}`,
            html: htmlContent,
        });
        console.log(`Admin notification email sent for order #${order.id}`);
    } catch (error) {
        console.error('Error sending admin notification email:', error);
    }
};

const dispatchOrderEmails = (order, customerEmail) => {
    // Send asynchronously in the background
    Promise.all([
        sendOrderConfirmationEmail(order, customerEmail),
        sendAdminNotificationEmail(order, customerEmail)
    ]).catch(err => console.error('Error in email dispatch queue:', err));
};

module.exports = {
    dispatchOrderEmails
};
