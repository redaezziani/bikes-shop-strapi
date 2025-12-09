/**
 * order controller
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::order.order',
  ({ strapi }) => ({
    /**
     * Create order and initiate Stripe checkout
     * POST /api/checkout
     */
    async checkout(ctx) {
      try {
        const {
          customerEmail,
          customerName,
          customerPhone,
          customerAddress,
          customerCity,
          customerCountry,
          note,
          agreedToTerms,
          items,
        } = ctx.request.body;

        console.log(items);

        if (!customerEmail || !customerName || !items?.length) {
          return ctx.badRequest(
            'Missing required fields: customerEmail, customerName, items',
          );
        }

        if (!agreedToTerms) {
          return ctx.badRequest(
            'You must agree to the terms and privacy policy',
          );
        }

        const orderService = strapi.service('api::order.order');
        const order = await orderService.createOrderWithItems({
          customerEmail,
          customerName,
          customerPhone,
          customerAddress,
          customerCity,
          customerCountry,
          note,
          agreedToTerms,
          items,
        });

        const stripeService = strapi.service('api::order.stripe');
        const session = await stripeService.createCheckoutSession({
          orderId: order.id,
          customerEmail,
          customerName,
          items,
          totalAmount: order.total_amount,
          currency: 'usd',
        });

        ctx.body = {
          orderId: order.id,
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        console.error('Checkout error:', error);
        ctx.internalServerError('Checkout failed');
      }
    },

    /**
     * Handle Stripe webhook for payment completion
     * POST /api/webhooks/stripe
     */
    async stripeWebhook(ctx) {
      try {
        const sig = ctx.request.headers['stripe-signature'];

        if (!sig) {
          console.error('Missing stripe-signature header');
          return ctx.badRequest('Missing Stripe signature');
        }

        // Get raw body from unparsed body symbol
        const rawBody = ctx.request.body[Symbol.for('unparsedBody')];

        if (!rawBody) {
          console.error('Raw body not available');
          console.error(
            'Available body properties:',
            Object.keys(ctx.request.body),
          );
          console.error(
            'Body symbols:',
            Object.getOwnPropertySymbols(ctx.request.body).map((s) =>
              s.toString(),
            ),
          );
          return ctx.badRequest(
            'Raw body not available for signature verification',
          );
        }

        console.log('Processing webhook...');
        console.log('Raw body type:', typeof rawBody);
        console.log(
          'Raw body length:',
          Buffer.isBuffer(rawBody) ? rawBody.length : rawBody.length,
        );

        const stripeService = strapi.service('api::order.stripe');

        // This will throw an error if verification fails
        const event = stripeService.verifyWebhookSignature(rawBody, sig);

        console.log(
          `Webhook verified! Event type: ${event.type}, Event ID: ${event.id}`,
        );

        // Handle different event types
        switch (event.type) {
          case 'checkout.session.completed':
            await this.handleCheckoutSessionCompleted(event.data.object);
            break;

          case 'charge.succeeded':
            console.log('Charge succeeded event received');
            // Optionally handle charge.succeeded
            break;

          case 'payment_intent.succeeded':
            console.log('Payment intent succeeded event received');
            // Optionally handle payment_intent.succeeded
            break;

          case 'charge.refunded':
            await this.handleChargeRefunded(event.data.object);
            break;

          case 'payment_intent.payment_failed':
            await this.handlePaymentFailed(event.data.object);
            break;

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        ctx.body = { received: true };
        ctx.status = 200;
      } catch (error) {
        console.error('Webhook processing error:', error);
        // Return 200 to prevent Stripe from retrying on verification errors
        ctx.status = 200;
        ctx.body = { received: true, error: 'Webhook processing failed' };
      }
    },

    /**
     * Handle checkout session completed event
     */
    async handleCheckoutSessionCompleted(session: any) {
      try {
        console.log('Processing checkout.session.completed:', {
          sessionId: session.id,
          clientRefId: session.client_reference_id,
          paymentStatus: session.payment_status,
        });

        const clientRefId = session.client_reference_id;

        if (!clientRefId) {
          console.warn('No client_reference_id found in session');
          return;
        }

        // Extract orderId from client_reference_id (format: order_<id>)
        const orderId = parseInt(clientRefId.replace('order_', ''), 10);

        if (isNaN(orderId)) {
          console.error(
            'Invalid orderId extracted from client_reference_id:',
            clientRefId,
          );
          return;
        }

        console.log(`Processing payment for order ID: ${orderId}`);

        // Find the order by ID
        const orders = await strapi.documents('api::order.order').findMany({
          filters: { id: { $eq: orderId } },
        });

        if (orders.length === 0) {
          console.error(`Order ${orderId} not found in database`);
          return;
        }

        const order = orders[0];

        console.log('Found order:', {
          id: order.id,
          documentId: order.documentId,
          currentPaymentStatus: order.payment_status,
        });

        // Update order with payment information
        const updatedOrder = await strapi.documents('api::order.order').update({
          documentId: order.documentId,
          data: {
            payment_status: 'paid',
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent || null,
          },
        });

        console.log(`✓ Order ${orderId} successfully marked as paid`, {
          documentId: updatedOrder.documentId,
          newPaymentStatus: updatedOrder.payment_status,
          sessionId: updatedOrder.stripe_session_id,
          paymentIntent: updatedOrder.stripe_payment_intent,
        });

        // Send confirmation email to customer and admin
        try {
          const emailService = strapi.service('api::order.email');
          await emailService.sendOrderConfirmation(orderId);
          console.log(`✓ Order confirmation emails sent for order ${orderId}`);
        } catch (emailError) {
          console.error('Failed to send order confirmation emails:', emailError);
          // Don't throw error - order is still valid even if email fails
        }
      } catch (error) {
        console.error('Error handling checkout.session.completed:', error);
        throw error;
      }
    },

    /**
     * Handle charge refunded event
     */
    async handleChargeRefunded(charge: any) {
      try {
        console.log('Processing charge.refunded:', charge.id);

        if (!charge.metadata?.orderId) {
          console.warn('No orderId in charge metadata');
          return;
        }

        const orderId = parseInt(charge.metadata.orderId, 10);

        // Find and update order
        const orders = await strapi.documents('api::order.order').findMany({
          filters: { id: { $eq: orderId } },
        });

        if (orders.length > 0) {
          await strapi.documents('api::order.order').update({
            documentId: orders[0].documentId,
            data: { payment_status: 'refunded' },
          });
          console.log(`Order ${orderId} marked as refunded`);
        }
      } catch (error) {
        console.error('Error handling charge.refunded:', error);
        throw error;
      }
    },

    /**
     * Handle payment failed event
     */
    async handlePaymentFailed(paymentIntent: any) {
      try {
        console.log(
          'Processing payment_intent.payment_failed:',
          paymentIntent.id,
        );

        if (!paymentIntent.metadata?.orderId) {
          console.warn('No orderId in payment intent metadata');
          return;
        }

        const orderId = parseInt(paymentIntent.metadata.orderId, 10);

        // Find and update order
        const orders = await strapi.documents('api::order.order').findMany({
          filters: { id: { $eq: orderId } },
        });

        if (orders.length > 0) {
          await strapi.documents('api::order.order').update({
            documentId: orders[0].documentId,
            data: { payment_status: 'failed' },
          });
          console.log(`Order ${orderId} marked as failed (payment failed)`);
        }
      } catch (error) {
        console.error('Error handling payment_intent.payment_failed:', error);
        throw error;
      }
    },
  }),
);
