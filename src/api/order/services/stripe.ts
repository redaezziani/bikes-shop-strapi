/**
 * Stripe payment service
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
});

interface LineItem {
  price_data: {
    currency: string;
    product_data: {
      name: string;
      description?: string;
    };
    unit_amount: number;
  };
  quantity: number;
}

interface CreateSessionParams {
  orderId: string | number;
  customerEmail: string;
  customerName: string;
  items: Array<{
    item_type: 'bike' | 'accessory';
    product?: {
      id: number;
      name: string;
      documentId: string;
    };
    accessory?: {
      id: number;
      name: string;
      documentId: string;
    };
    quantity: number;
    unit_price: number;
    color_name?: string;
  }>;
  totalAmount: number;
  currency: string;
}

export default {
  async createCheckoutSession(params: CreateSessionParams) {
    const {
      orderId,
      customerEmail,
      customerName,
      items,
      totalAmount,
      currency,
    } = params;

    try {
      // Prepare line items for Stripe (only paid items)
      const lineItems: LineItem[] = items
        .map((item) => {
          let productName = '';
          let description = '';

          if (item.item_type === 'bike' && item.product) {
            productName = item.product.name;
            description = item.color_name
              ? `Color: ${item.color_name}`
              : 'Bike';
          } else if (item.item_type === 'accessory' && item.accessory) {
            productName = item.accessory.name;
            description = 'Accessory';
          }

          // Skip items without a name or free items (Stripe doesn't support 0 price)
          if (!productName) {
            console.warn(
              `Skipping item with missing name: ${JSON.stringify(item)}`,
            );
            return null;
          }

          // Skip free items - they will be included in the order but not charged
          if (item.unit_price === 0) {
            console.log(
              `Free item not added to Stripe checkout: ${productName}`,
            );
            return null;
          }

          return {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: productName,
                description,
              },
              unit_amount: Math.round(item.unit_price * 100), // Amount in cents
            },
            quantity: item.quantity,
          };
        })
        .filter((item) => item !== null) as LineItem[];

      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}?order=success`,
        cancel_url: `${process.env.FRONTEND_URL}?order=cancelled`,
        customer_email: customerEmail,
        client_reference_id: `order_${orderId}`,
        metadata: {
          orderId: String(orderId),
          customerName,
          itemCount: String(items.length),
        },
      });

      return session;
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw error;
    }
  },

  async getSessionDetails(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });
      return session;
    } catch (error) {
      console.error('Error retrieving Stripe session:', error);
      throw error;
    }
  },

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
    }

    console.log('Verifying webhook signature...');
    console.log('Signature header:', signature);
    console.log('Raw body type:', typeof rawBody);
    console.log(
      'Raw body length:',
      Buffer.isBuffer(rawBody) ? rawBody.length : rawBody.length,
    );

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );

      console.log('Webhook signature verified successfully');
      console.log('Event type:', event.type);
      console.log('Event ID:', event.id);

      return event;
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  },

  async handlePaymentSuccess(sessionId: string, orderId: number) {
    try {
      // Update order payment_status to paid
      await strapi.documents('api::order.order').update({
        documentId: String(orderId),
        data: {
          payment_status: 'paid',
          stripe_session_id: sessionId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating order payment status:', error);
      throw error;
    }
  },

  async handlePaymentFailed(sessionId: string, orderId: number) {
    try {
      // Update order payment_status to failed
      await strapi.documents('api::order.order').update({
        documentId: String(orderId),
        data: {
          payment_status: 'failed',
          stripe_session_id: sessionId,
        },
      });

      return true;
    } catch (error) {
      console.error('Error updating order payment status:', error);
      throw error;
    }
  },
};
