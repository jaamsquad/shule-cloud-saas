import { Router } from 'express';
import { checkSubdomain, registerTenant, verifyEmailOtp, resendEmailOtp, activateTenant, registrationStatus } from '../controllers/onboard.controller';
import { submitContactMessage, getPublicSettings } from '../controllers/owner.controller';

const router = Router();

router.get('/check-subdomain', checkSubdomain);
router.post('/register-tenant', registerTenant);
router.post('/verify-email', verifyEmailOtp);
router.post('/resend-otp', resendEmailOtp);
router.post('/activate', activateTenant);
router.get('/registration-status', registrationStatus);

// Public, unauthenticated endpoints (onboard prefix is exempt from tenancy).
router.post('/contact', submitContactMessage);          // /api/v1/onboard/contact
router.get('/public-settings', getPublicSettings);      // /api/v1/onboard/public-settings

export default router;
