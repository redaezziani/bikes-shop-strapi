/**
 * support-page router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::support-page.support-page' as any, {
  only: ['find'],
});
