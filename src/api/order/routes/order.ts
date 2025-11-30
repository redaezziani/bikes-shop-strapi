/**
 * order router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::order.order', {
  only: ['find', 'findOne', 'create', 'update', 'delete'],
  config: {
    find: {
      auth: false,
    },
    findOne: {
      auth: false,
    },
    create: {
      auth: false,
    },
    update: {
      auth: false,
    },
    delete: {
      auth: false,
    },
  },
});
