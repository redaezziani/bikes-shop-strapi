export default {
  name: 'strapi::cors',
  config: {
    enabled: true,
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    headers: ['Content-Type', 'Authorization', 'X-Frame-Options', 'stripe-signature'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
  },
};
