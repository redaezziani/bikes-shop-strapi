/**
 * warranty-page router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::warranty-page.warranty-page' as any, {
  only: ['find'],
});
