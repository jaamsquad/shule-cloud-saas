import { Router } from 'express';
import { login, getTenantProfile, updateTenantProfile, updateUser, deleteUser } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.get('/tenant/profile', getTenantProfile);
router.patch('/tenant/profile', updateTenantProfile);
router.patch('/tenant/user/:id', updateUser);
router.delete('/tenant/user/:id', deleteUser);

export default router;
