/**
 * shipping-returns-page router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::shipping-returns-page.shipping-returns-page' as any, {
  only: ['find'],
});
