import { ObjectId } from 'mongodb';

// ─── Branding ──────────────────────────────────────────────────────────────────
export interface TenantBranding {
    logo?: string;            // institution logo (data URL or https URL)
    favicon?: string;
    schoolName?: string;
    primaryColor?: string;
    secondaryColor?: string;
    loginBackground?: string;
    portalTheme?: 'light' | 'dark' | 'system';
}

// ─── Custom domain status (mirrors Cloudflare custom hostname) ─────────────────
export type VerificationStatus =
    | 'none'            // no custom domain
    | 'pending'         // awaiting DNS / ownership verification
    | 'active'          // verified
    | 'failed';         // verification failed

export type SslStatus =
    | 'none'
    | 'pending_validation'
    | 'pending_issuance'
    | 'active'
    | 'failed';

export interface DnsRecord {
    type: 'CNAME' | 'TXT' | 'A';
    host: string;
    target: string;
    purpose: string;       // "Domain connection" | "Ownership verification" | "SSL validation"
    status?: VerificationStatus | SslStatus;
}

// ─── Tenant ─────────────────────────────────────────────────────────────────────
export interface Tenant {
    _id?: ObjectId;
    schoolName: string;
    tenantId: string;
    subdomain: string;
    databaseName?: string;
    status: 'active' | 'inactive' | 'suspended';

    // Custom domain (Cloudflare for SaaS)
    customDomain?: string | null;
    cloudflareHostnameId?: string | null;
    verificationStatus: VerificationStatus;
    sslStatus: SslStatus;
    dnsRecords?: DnsRecord[];
    domainConnectedAt?: Date | null;

    // Branding
    branding?: TenantBranding;
    logo?: string;          // legacy top-level logo (kept for back-compat)
    name?: string;

    createdAt?: Date;
    updatedAt?: Date;
}

// ─── Audit log ──────────────────────────────────────────────────────────────────
export interface DomainAuditLog {
    _id?: ObjectId;
    tenantId: string;
    schoolName?: string;
    user?: string;          // who performed the action
    action: 'domain_added' | 'domain_removed' | 'domain_verified' | 'ssl_activated' | 'verification_failed' | 'recheck';
    domain: string;
    detail?: string;
    ip?: string;
    createdAt: Date;
}

// ─── Cloudflare custom hostname API shapes (subset we use) ─────────────────────
export interface CfCustomHostname {
    id: string;
    hostname: string;
    status: string;                 // pending | active | active_redeploying | ...
    ssl: {
        status: string;             // pending_validation | active | ...
        method?: string;
        validation_records?: { txt_name?: string; txt_value?: string; http_url?: string; http_body?: string }[];
        txt_name?: string;
        txt_value?: string;
    };
    ownership_verification?: { type: string; name: string; value: string };
    ownership_verification_http?: { http_url: string; http_body: string };
    verification_errors?: string[];
}
