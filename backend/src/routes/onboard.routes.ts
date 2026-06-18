import { Router } from 'express';
import { checkSubdomain, registerTenant } from '../controllers/onboard.controller';
import { submitContactMessage, getPublicSettings } from '../controllers/owner.controller';

const router = Router();

router.get('/check-subdomain', checkSubdomain);
router.post('/register-tenant', registerTenant);

// Public, unauthenticated endpoints (onboard prefix is exempt from tenancy).
router.post('/contact', submitContactMessage);          // /api/v1/onboard/contact
router.get('/public-settings', getPublicSettings);      // /api/v1/onboard/public-settings

export default router;
