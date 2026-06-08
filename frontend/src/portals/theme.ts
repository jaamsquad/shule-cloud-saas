import { GraduationCap, Briefcase, Users, type LucideIcon } from "lucide-react";

// Per-portal identity: accent colour + role icon. Used by the login crest and
// the sidebar so each portal is visually distinct but consistent within itself.
export interface PortalTheme {
    accent: string;       // sidebar + login panel + buttons
    accentDark: string;   // hover / active
    icon: LucideIcon;
}

export const PORTAL_THEME: Record<"student" | "staff" | "parent", PortalTheme> = {
    student: { accent: "#159a52", accentDark: "#0f7a40", icon: GraduationCap },
    staff: { accent: "#0e7490", accentDark: "#0b5a70", icon: Briefcase },
    parent: { accent: "#7c3aed", accentDark: "#6326c9", icon: Users },
};
