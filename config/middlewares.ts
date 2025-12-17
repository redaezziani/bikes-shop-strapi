export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://72.61.203.223:3000',
        'https://alongweride.com',
        'https://www.alongweride.com',
      ],
      credentials: true,
      headers: [
        'Content-Type',
        'Authorization',
        'X-Frame-Options',
        'stripe-signature',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '3mb',
      formLimit: '10mb',
      textLimit: '256kb',
      includeUnparsed: true, // Preserves raw body for webhook signature verification
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
