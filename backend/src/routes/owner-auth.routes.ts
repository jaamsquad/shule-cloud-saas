import { Router } from 'express';
import { registerOwner, loginOwner, verifyOwnerOtp, resendOwnerOtp, changeOwnerPassword } from '../controllers/owner-auth.controller';

const router = Router();

router.post('/register', registerOwner);
router.post('/login', loginOwner);
router.post('/verify-otp', verifyOwnerOtp);
router.post('/resend-otp', resendOwnerOtp);
router.post('/change-password', changeOwnerPassword);

export default router;
