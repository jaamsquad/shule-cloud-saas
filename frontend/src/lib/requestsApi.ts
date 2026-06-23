import api from "./api";

export type ReqStatus =
    | "Draft" | "Submitted" | "Seen" | "Pending Approval" | "Approved" | "Rejected"
    | "Forwarded" | "Processing" | "Waiting for Information" | "Waiting for Quotation"
    | "Ordered" | "Purchased" | "Payment Pending" | "Paid" | "Completed" | "Cancelled" | "Archived";

export interface RequestDoc {
    _id: string;
    number: string;
    category: string; title: string; description?: string;
    quantity?: number | null; priority: "Low" | "Medium" | "High" | "Urgent";
    estimatedCost?: number; comments?: string;
    attachments?: { name: string; url: string; type?: string }[];
    requesterId?: string | null; requesterName?: string; requesterRole?: string; department?: string;
    status: ReqStatus;
    currentOwnerId?: string | null; currentOwnerName?: string; currentOffice?: string;
    supplier?: string; rejectedReason?: string;
    createdAt: string; updatedAt?: string; completedAt?: string;
}

export interface TimelineEntry { action: string; fromStatus: string; toStatus: string; note?: string; byName: string; byRole?: string; office?: string; at: string; }
export interface CommentEntry { text: string; byName: string; byRole?: string; office?: string; at: string; }

export const reqApi = {
    // config
    offices: () => api.get("/requests/offices").then(r => r.data as { _id: string; name: string }[]),
    addOffice: (name: string) => api.post("/requests/offices", { name }).then(r => r.data),
    delOffice: (id: string) => api.delete(`/requests/offices/${id}`).then(r => r.data),
    categories: () => api.get("/requests/categories").then(r => r.data as { _id: string; name: string }[]),
    addCategory: (name: string) => api.post("/requests/categories", { name }).then(r => r.data),
    delCategory: (id: string) => api.delete(`/requests/categories/${id}`).then(r => r.data),
    supervisors: () => api.get("/requests/supervisors").then(r => r.data as { _id: string; name: string; role?: string; department?: string }[]),

    // create / edit
    create: (body: any) => api.post("/requests", body).then(r => r.data),
    update: (id: string, body: any) => api.put(`/requests/${id}`, body).then(r => r.data),
    remove: (id: string) => api.delete(`/requests/${id}`).then(r => r.data),

    // lists
    mine: (params?: any) => api.get("/requests/mine", { params }).then(r => r.data as RequestDoc[]),
    inbox: (params?: any) => api.get("/requests/inbox", { params }).then(r => r.data as RequestDoc[]),
    all: (params?: any) => api.get("/requests/all", { params }).then(r => r.data as RequestDoc[]),
    get: (id: string) => api.get(`/requests/${id}`).then(r => r.data as RequestDoc & { history: TimelineEntry[]; comments: CommentEntry[]; audit: any[] }),

    // actions
    approve: (id: string, body: { comment?: string; forwardTo?: string; forwardUserId?: string }) => api.post(`/requests/${id}/approve`, body).then(r => r.data),
    reject: (id: string, reason: string) => api.post(`/requests/${id}/reject`, { reason }).then(r => r.data),
    forward: (id: string, body: { forwardTo?: string; forwardUserId?: string; comment?: string }) => api.post(`/requests/${id}/forward`, body).then(r => r.data),
    requestInfo: (id: string, comment: string) => api.post(`/requests/${id}/request-info`, { comment }).then(r => r.data),
    comment: (id: string, text: string) => api.post(`/requests/${id}/comment`, { text }).then(r => r.data),
    stage: (id: string, action: string, body: any = {}) => api.post(`/requests/${id}/stage/${action}`, body).then(r => r.data),
    complete: (id: string, comment?: string) => api.post(`/requests/${id}/complete`, { comment }).then(r => r.data),
    cancel: (id: string, comment?: string) => api.post(`/requests/${id}/cancel`, { comment }).then(r => r.data),

    // notifications & stats
    notifications: () => api.get("/requests/notifications/list").then(r => r.data),
    count: () => api.get("/requests/notifications/count").then(r => r.data as { unread: number; inbox: number }),
    markRead: (body: { id?: string; requestId?: string } = {}) => api.post("/requests/notifications/read", body).then(r => r.data),
    stats: () => api.get("/requests/stats/overview").then(r => r.data),
};

// ── Status badge styling ──────────────────────────────────────────────────────
export const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
    Draft: { bg: "#f1f5f9", fg: "#475569" },
    Submitted: { bg: "#dbeafe", fg: "#1d4ed8" },
    Seen: { bg: "#e0f2fe", fg: "#0369a1" },
    "Pending Approval": { bg: "#ffedd5", fg: "#c2410c" },
    Approved: { bg: "#dcfce7", fg: "#15803d" },
    Rejected: { bg: "#fee2e2", fg: "#b91c1c" },
    Forwarded: { bg: "#f3e8ff", fg: "#7e22ce" },
    Processing: { bg: "#ccfbf1", fg: "#0f766e" },
    "Waiting for Information": { bg: "#fef9c3", fg: "#a16207" },
    "Waiting for Quotation": { bg: "#fef9c3", fg: "#a16207" },
    Ordered: { bg: "#e0e7ff", fg: "#4338ca" },
    Purchased: { bg: "#e0e7ff", fg: "#3730a3" },
    "Payment Pending": { bg: "#ffedd5", fg: "#c2410c" },
    Paid: { bg: "#dcfce7", fg: "#166534" },
    Completed: { bg: "#bbf7d0", fg: "#14532d" },
    Cancelled: { bg: "#f1f5f9", fg: "#64748b" },
    Archived: { bg: "#f1f5f9", fg: "#64748b" },
};
export const statusStyle = (s: string) => STATUS_STYLES[s] || { bg: "#f1f5f9", fg: "#475569" };

export const PRIORITY_STYLES: Record<string, { bg: string; fg: string }> = {
    Low: { bg: "#f1f5f9", fg: "#64748b" },
    Medium: { bg: "#dbeafe", fg: "#1d4ed8" },
    High: { bg: "#ffedd5", fg: "#c2410c" },
    Urgent: { bg: "#fee2e2", fg: "#b91c1c" },
};

// Offices that an approver can forward to (loaded dynamically + "Custom User").
export const ksh = (n: any) => `KSh ${(Number(n) || 0).toLocaleString()}`;
