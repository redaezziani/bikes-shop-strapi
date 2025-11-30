/**
 * Stripe webhook routes
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/webhooks/stripe',
      handler: 'api::order.order.stripeWebhook',
      config: {
        auth: false,
      },
    },
  ],
};
