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
        'X-Cache',
        'X-Cache-Key',
        'X-Cache-TTL',
        'X-Cache-Stored',
      ],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      exposeHeaders: ['X-Cache', 'X-Cache-Key', 'X-Cache-TTL', 'X-Cache-Stored'],
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
  // Redis Cache Middleware - placed after public middleware to cache API responses
  {
    name: 'global::cache',
    config: {
      maxAge: 300, // 5 minutes
      excludeRoutes: [
        '/admin',
        '/api/auth',
        '/api/upload',
        '/_health',
        '/api/orders',
        '/api/users-permissions',
      ],
      includeQuery: true,
    },
  },
];
