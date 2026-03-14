import { Router } from 'express';
import { checkSubdomain, registerTenant } from '../controllers/onboard.controller';

const router = Router();

router.get('/check-subdomain', checkSubdomain);
router.post('/register-tenant', registerTenant);

export default router;
