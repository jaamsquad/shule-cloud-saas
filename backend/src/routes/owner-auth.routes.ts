import { Router } from 'express';
import { registerOwner, loginOwner } from '../controllers/owner-auth.controller';

const router = Router();

router.post('/register', registerOwner);
router.post('/login', loginOwner);

export default router;
