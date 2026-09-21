/** Who is acting, as a plain string for audit fields (createdBy, updatedBy, user …). Never the whole user object. */
export const actorOf = (req: any): string => {
    const u = req?.tenantContext?.user;
    if (!u) return 'admin';
    if (typeof u === 'string') return u;
    return String(u.name || u.staffId || u.role || 'admin');
};
