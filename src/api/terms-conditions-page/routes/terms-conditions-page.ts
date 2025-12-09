/**
 * terms-conditions-page router
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::terms-conditions-page.terms-conditions-page' as any, {
  only: ['find'],
});
