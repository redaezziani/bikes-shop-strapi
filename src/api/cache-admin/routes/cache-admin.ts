export default {
  routes: [
    {
      method: 'GET',
      path: '/cache/stats',
      handler: 'cache-admin.getStats',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/cache/clear',
      handler: 'cache-admin.clearCache',
      config: {
        policies: [],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/cache/invalidate',
      handler: 'cache-admin.invalidateRoute',
      config: {
        policies: [],
        auth: false,
      },
    },
  ],
};
