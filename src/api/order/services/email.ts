/**
 * Email service using Resend
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default () => ({
  /**
   * Send order confirmation email to customer and admin
   */
  async sendOrderConfirmation(orderId: number) {
    try {
      // Fetch order with items
      const orders = await strapi.documents('api::order.order').findMany({
        filters: { id: { $eq: orderId } },
        populate: ['items', 'items.product'],
      });

      if (orders.length === 0) {
        throw new Error(`Order ${orderId} not found`);
      }

      const order = orders[0];

      // Create email content
      const emailHtml = this.generateOrderEmailHtml(order);

      // Send email to customer
      const customerEmail = await resend.emails.send({
        from: 'onboarding@resend.dev', // Default Resend email
        to: order.customer_email,
        subject: `Order Confirmation #${order.id}`,
        html: emailHtml,
      });

      console.log('Customer email sent:', customerEmail);

      // Send email to admin/yourself
      const adminEmail = process.env.ADMIN_EMAIL || order.customer_email;
      const adminEmailResult = await resend.emails.send({
        from: 'onboarding@resend.dev', // Default Resend email
        to: adminEmail,
        subject: `New Order Received #${order.id}`,
        html: emailHtml,
      });

      console.log('Admin email sent:', adminEmailResult);

      return {
        customerEmail,
        adminEmail: adminEmailResult,
      };
    } catch (error) {
      console.error('Error sending order confirmation email:', error);
      throw error;
    }
  },

  /**
   * Generate HTML email template for order confirmation
   */
  generateOrderEmailHtml(order: any) {
    const itemsHtml = order.items
      ?.map(
        (item: any) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            ${item.product?.title || 'Product'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
            $${Number(item.price).toFixed(2)}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
            $${(Number(item.price) * item.quantity).toFixed(2)}
          </td>
        </tr>
      `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                  <!-- Header -->
                  <tr>
                    <td style="background-color: #2c3e50; padding: 30px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Order Confirmation</h1>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">

                      <h2 style="margin-top: 0; color: #2c3e50;">Thank you for your order!</h2>

                      <p style="color: #555; font-size: 16px; line-height: 1.6;">
                        Hi ${order.customer_name},<br><br>
                        We've received your order and it's being processed. Here are your order details:
                      </p>

                      <!-- Order Info -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td style="padding: 10px 0; color: #777;">Order Number:</td>
                          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #2c3e50;">#${order.id}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #777;">Payment Status:</td>
                          <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #27ae60;">${order.payment_status.toUpperCase()}</td>
                        </tr>
                      </table>

                      <!-- Customer Info -->
                      <h3 style="color: #2c3e50; margin-top: 30px;">Shipping Information</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0;">
                        <tr>
                          <td style="color: #555; line-height: 1.6;">
                            ${order.customer_name}<br>
                            ${order.customer_email}<br>
                            ${order.customer_phone ? `${order.customer_phone}<br>` : ''}
                            ${order.customer_address ? `${order.customer_address}<br>` : ''}
                            ${order.customer_city ? `${order.customer_city}, ` : ''}${order.customer_country || ''}
                          </td>
                        </tr>
                      </table>

                      ${order.note ? `
                      <h3 style="color: #2c3e50; margin-top: 30px;">Order Note</h3>
                      <p style="color: #555; background-color: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #2c3e50;">
                        ${order.note}
                      </p>
                      ` : ''}

                      <!-- Order Items -->
                      <h3 style="color: #2c3e50; margin-top: 30px;">Order Items</h3>
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 15px 0; border-collapse: collapse;">
                        <thead>
                          <tr style="background-color: #f8f9fa;">
                            <th style="padding: 12px; text-align: left; color: #2c3e50; font-weight: bold;">Product</th>
                            <th style="padding: 12px; text-align: center; color: #2c3e50; font-weight: bold;">Qty</th>
                            <th style="padding: 12px; text-align: right; color: #2c3e50; font-weight: bold;">Price</th>
                            <th style="padding: 12px; text-align: right; color: #2c3e50; font-weight: bold;">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colspan="3" style="padding: 20px 12px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #2c3e50;">
                              Total Amount:
                            </td>
                            <td style="padding: 20px 12px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #27ae60;">
                              $${Number(order.total_amount).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>

                      <p style="color: #777; font-size: 14px; margin-top: 30px; line-height: 1.6;">
                        If you have any questions about your order, please don't hesitate to contact us.
                      </p>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 40px; text-align: center; color: #777; font-size: 12px;">
                      <p style="margin: 0;">Thank you for shopping with us!</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  },
});
