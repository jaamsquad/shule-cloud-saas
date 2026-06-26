import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Authenticated organization-level user (set by requireOrgAuth).
export interface OrgPrincipal {
    orgUserId: string;
    organizationId: string;
    role: string;            // ORG_OWNER | ORG_ADMIN | ORG_FINANCE_MANAGER | ...
    allowedBranchIds: string[];
    name?: string;
    email?: string;
}

declare global {
    namespace Express {
        interface Request { orgUser?: OrgPrincipal; }
    }
}

const SECRET = process.env.JWT_SECRET || 'secret';

export function signOrgToken(p: OrgPrincipal) {
    return jwt.sign(p, SECRET, { expiresIn: '7d' });
}

/** Require a valid organization JWT. Attaches req.orgUser. */
export function requireOrgAuth(req: Request, res: Response, next: NextFunction) {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return res.status(401).json({ message: 'Organization sign-in required.' });
    try {
        const d: any = jwt.verify(h.slice(7), SECRET);
        if (!d.organizationId || !d.orgUserId) return res.status(401).json({ message: 'Not an organization token.' });
        req.orgUser = {
            orgUserId: String(d.orgUserId), organizationId: String(d.organizationId),
            role: d.role || '', allowedBranchIds: (d.allowedBranchIds || []).map(String),
            name: d.name, email: d.email,
        };
        next();
    } catch {
        return res.status(401).json({ message: 'Session expired. Please sign in again.' });
    }
}

/** Restrict to specific org roles. */
export function requireOrgRole(...roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.orgUser) return res.status(401).json({ message: 'Organization sign-in required.' });
        if (roles.length && !roles.includes(req.orgUser.role)) {
            return res.status(403).json({ message: 'You do not have permission for this action.' });
        }
        next();
    };
}
