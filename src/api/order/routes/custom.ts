/**
 * Custom order routes for checkout
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/checkout',
      handler: 'api::order.order.checkout',
      config: {
        auth: false,
      },
    },
  ],
};
