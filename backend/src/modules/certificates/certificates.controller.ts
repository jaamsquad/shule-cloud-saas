import { Request, Response } from 'express';
import { getMetaDb } from '../../lib/mongodb';
import { ObjectId } from 'mongodb';
const getRequestDb = (req: any) => req.tenantDb || getMetaDb();

// Helper to get db & ensure tenancy
const getTenancyQuery = (req: Request) => {
    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) throw new Error("Tenant context missing");
    return { tenantId: new ObjectId(tenantId) };
};

export class CertificatesController {
    // --- CERTIFICATE TEMPLATES ---

    public static async getTemplates(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const templates = await db.collection('certificate_templates').find(query).toArray();
            
            // If no templates, seed built-in ones
            if (templates.length === 0) {
                const builtin = [
                    { ...query, name: "Classic Gold", type: "BUILTIN", badge: "Classic", description: "Ornate gold border, serif fonts, ivory background.", accent_color: "#D4AF37", is_active: true, created_at: new Date() },
                    { ...query, name: "Modern Corporate", type: "BUILTIN", badge: "Modern", description: "Clean white & navy blue, geometric corners.", accent_color: "#1E3A8A", is_active: false, created_at: new Date() },
                    { ...query, name: "Elegant Floral", type: "BUILTIN", badge: "Elegant", description: "Soft pastel background, watercolor corners.", accent_color: "#F472B6", is_active: false, created_at: new Date() },
                    { ...query, name: "Royal Purple", type: "BUILTIN", badge: "Royal", description: "Deep purple gradient, gold lettering.", accent_color: "#6B21A8", is_active: false, created_at: new Date() },
                    { ...query, name: "Achievement Red", type: "BUILTIN", badge: "Bold", description: "Bold red & white, star burst accents.", accent_color: "#DC2626", is_active: false, created_at: new Date() },
                    { ...query, name: "Minimalist Ink", type: "BUILTIN", badge: "Minimal", description: "Pure white, thin border, black serif typography.", accent_color: "#171717", is_active: false, created_at: new Date() }
                ];
                await db.collection('certificate_templates').insertMany(builtin);
                const newTemplates = await db.collection('certificate_templates').find(query).toArray();
                return res.json({ data: newTemplates });
            }

            res.json({ data: templates });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async getActiveTemplate(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const template = await db.collection('certificate_templates').findOne({ ...query, is_active: true });
            res.json({ data: template });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async activateTemplate(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const query = getTenancyQuery(req);
            const { id } = req.params;

            await db.collection('certificate_templates').updateMany(query, { $set: { is_active: false } });
            await db.collection('certificate_templates').updateOne({ ...query, _id: new ObjectId(id) }, { $set: { is_active: true } });
            
            res.json({ message: "Template activated successfully" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    // --- CERTIFICATES ---

    public static async getCertificates(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const query: any = { ...getTenancyQuery(req) };
            if (req.query.type) query['certificate_type'] = req.query.type;
            if (req.query.class_id) query['class_id'] = req.query.class_id;
            if (req.query.status) query['status'] = req.query.status;

            const certs = await db.collection('certificates').find(query).sort({ created_at: -1 }).toArray();
            res.json({ data: certs });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async createCertificate(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const payload = {
                ...req.body,
                ...getTenancyQuery(req),
                status: 'DRAFT',
                created_at: new Date()
            };
            const result = await db.collection('certificates').insertOne(payload);
            res.json({ data: { _id: result.insertedId, ...payload } });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async updateCertificate(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new ObjectId(id) };
            
            await db.collection('certificates').updateOne(query, { $set: req.body });
            res.json({ message: "Certificate updated" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async issueCertificate(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new ObjectId(id) };
            
            await db.collection('certificates').updateOne(query, { $set: { status: 'ISSUED', issued_at: new Date() } });
            res.json({ message: "Certificate issued" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async revokeCertificate(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new ObjectId(id) };
            
            await db.collection('certificates').updateOne(query, { $set: { status: 'REVOKED', revoked_at: new Date() } });
            res.json({ message: "Certificate revoked" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async deleteCertificate(req: Request, res: Response) {
        try {
            const db = getRequestDb(req);
            const { id } = req.params;
            const query = { ...getTenancyQuery(req), _id: new ObjectId(id) };
            
            await db.collection('certificates').deleteOne(query);
            res.json({ message: "Certificate deleted successfully" });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    public static async getPdf(req: Request, res: Response) {
        // Mock PDF generation for now
        res.setHeader('Content-Type', 'application/pdf');
        res.send(Buffer.from('%PDF-1.4\n%Simulated PDF Certificate\n%%EOF'));
    }
}