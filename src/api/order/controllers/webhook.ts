/**
 * Stripe webhook controller
 * This is a standalone webhook handler if you prefer to keep it separate from the main order controller
 */

export default {
  async handleStripeWebhook(ctx) {
    try {
      const sig = ctx.request.headers['stripe-signature'];

      if (!sig) {
        console.error('Missing stripe-signature header');
        return ctx.badRequest('Missing Stripe signature');
      }

      // Get raw body from unparsed body symbol (NOT ctx.request.rawBody)
      const rawBody = ctx.request.body[Symbol.for('unparsedBody')];

      if (!rawBody) {
        console.error('Raw body not available for signature verification');
        return ctx.badRequest('Raw body not available');
      }

      console.log('Processing webhook...');

      const stripeService = strapi.service('api::order.stripe');
      const event = stripeService.verifyWebhookSignature(rawBody, sig);

      console.log(`Webhook verified! Event type: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object);
          break;

        case 'charge.refunded':
          await handleChargeRefunded(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      ctx.body = { received: true };
      ctx.status = 200;
    } catch (error) {
      console.error('Webhook error:', error);
      // Return 200 to prevent Stripe from retrying
      ctx.status = 200;
      ctx.body = { received: true, error: 'Webhook processing failed' };
    }
  },
};

async function handleCheckoutSessionCompleted(session: any) {
  try {
    if (!session.client_reference_id) {
      console.warn('No order reference in checkout session');
      return;
    }

    const orderId = parseInt(
      session.client_reference_id.replace('order_', ''),
      10,
    );

    if (isNaN(orderId)) {
      console.error('Invalid orderId from client_reference_id');
      return;
    }

    console.log(`Processing payment for order ID: ${orderId}`);

    // IMPORTANT: Find the order by ID first to get the documentId
    const orders = await strapi.documents('api::order.order').findMany({
      filters: { id: { $eq: orderId } },
    });

    if (orders.length === 0) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    const order = orders[0];

    // Update order to paid payment_status
    await strapi.documents('api::order.order').update({
      documentId: order.documentId, // Use the actual documentId, not the numeric ID
      data: {
        payment_status: 'paid',
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
      },
    });

    console.log(`Order ${orderId} marked as paid`);

    // TODO: Send confirmation email here using your email service
    // await strapi.service('api::order.email').sendOrderConfirmation(orderId);
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
    throw error;
  }
}

async function handleChargeRefunded(charge: any) {
  try {
    if (!charge.metadata?.orderId) {
      console.warn('No order ID in charge metadata');
      return;
    }

    const orderId = parseInt(charge.metadata.orderId, 10);

    if (isNaN(orderId)) {
      console.error('Invalid orderId in charge metadata');
      return;
    }

    console.log(`Processing refund for order ID: ${orderId}`);

    // IMPORTANT: Find the order by ID first to get the documentId
    const orders = await strapi.documents('api::order.order').findMany({
      filters: { id: { $eq: orderId } },
    });

    if (orders.length === 0) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    const order = orders[0];

    // Update order payment_status
    await strapi.documents('api::order.order').update({
      documentId: order.documentId,
      data: {
        payment_status: 'refunded',
      },
    });

    console.log(`Order ${orderId} marked as refunded`);
  } catch (error) {
    console.error('Error handling charge.refunded:', error);
    throw error;
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  try {
    if (!paymentIntent.metadata?.orderId) {
      console.warn('No order ID in payment intent metadata');
      return;
    }

    const orderId = parseInt(paymentIntent.metadata.orderId, 10);

    if (isNaN(orderId)) {
      console.error('Invalid orderId in payment intent metadata');
      return;
    }

    console.log(`Processing payment failure for order ID: ${orderId}`);

    const orders = await strapi.documents('api::order.order').findMany({
      filters: { id: { $eq: orderId } },
    });

    if (orders.length === 0) {
      console.error(`Order ${orderId} not found`);
      return;
    }

    const order = orders[0];

    await strapi.documents('api::order.order').update({
      documentId: order.documentId,
      data: {
        payment_status: 'failed',
      },
    });

    console.log(`Order ${orderId} marked as failed`);
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
    throw error;
  }
}
