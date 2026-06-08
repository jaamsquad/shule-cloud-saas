import { Router } from 'express';
import { CertificatesController } from './certificates.controller';

const router = Router();

// Templates
router.get('/certificate-templates', CertificatesController.getTemplates);
router.get('/certificate-templates/active', CertificatesController.getActiveTemplate);
router.patch('/certificate-templates/:id/activate', CertificatesController.activateTemplate);

// Certificates
router.get('/certificates', CertificatesController.getCertificates);
router.post('/certificates', CertificatesController.createCertificate);
router.put('/certificates/:id', CertificatesController.updateCertificate);
router.patch('/certificates/:id/issue', CertificatesController.issueCertificate);
router.patch('/certificates/:id/revoke', CertificatesController.revokeCertificate);
router.delete('/certificates/:id', CertificatesController.deleteCertificate);
router.get('/certificates/:id/pdf', CertificatesController.getPdf);

export default router;
