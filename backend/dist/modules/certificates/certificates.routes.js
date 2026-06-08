"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const certificates_controller_1 = require("./certificates.controller");
const router = (0, express_1.Router)();
// Templates
router.get('/certificate-templates', certificates_controller_1.CertificatesController.getTemplates);
router.get('/certificate-templates/active', certificates_controller_1.CertificatesController.getActiveTemplate);
router.patch('/certificate-templates/:id/activate', certificates_controller_1.CertificatesController.activateTemplate);
// Certificates
router.get('/certificates', certificates_controller_1.CertificatesController.getCertificates);
router.post('/certificates', certificates_controller_1.CertificatesController.createCertificate);
router.put('/certificates/:id', certificates_controller_1.CertificatesController.updateCertificate);
router.patch('/certificates/:id/issue', certificates_controller_1.CertificatesController.issueCertificate);
router.patch('/certificates/:id/revoke', certificates_controller_1.CertificatesController.revokeCertificate);
router.delete('/certificates/:id', certificates_controller_1.CertificatesController.deleteCertificate);
router.get('/certificates/:id/pdf', certificates_controller_1.CertificatesController.getPdf);
exports.default = router;
