// Writes the menu for the ShuleCloud 360 mobile app, so the phone and the web always match:
//   sidebar — the web sidebar's groups and pages, in sidebar order (what the app shows)
//   apps    — the same pages grouped by area (kept for Roles & Permissions and older builds)
//   cd frontend && npx tsx --tsconfig tsconfig.app.json scripts/export-apps.ts
import { writeFileSync } from "fs";
import { resolve } from "path";
import { APPS, APP_CATEGORIES, appGroupItems, appModuleKeys } from "../src/lib/apps";
import { CREATE_PATHS, navItems } from "../src/components/navItems";
import * as Lucide from "lucide-react";

const iconName = (icon: unknown) => Object.entries(Lucide).find(([, v]) => v === icon)?.[0] || "Circle";
const colorOf = (label: string) => APPS.find(a => a.groups.includes(label))?.color || "#5C67F2";
const pageOf = (c: { label: string; path: string; pagePerm?: string; create?: boolean }) =>
    ({ label: c.label, path: c.path, perm: c.pagePerm || null, create: !!(c.create || CREATE_PATHS.has(c.path)) });

const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sidebar: navItems.map(g => ({
        label: g.label, module: g.moduleKey || null, icon: iconName(g.icon), color: colorOf(g.label), path: g.path || null,
        pages: (g.children || []).filter(c => c.path !== "/logout").map(pageOf),
    })),
    categories: APP_CATEGORIES,
    apps: APPS.map(a => ({
        key: a.key, name: a.name, description: a.description, category: a.category, color: a.color,
        path: a.path || null, modules: appModuleKeys(a),
        sections: appGroupItems(a).map(g => ({
            label: g.label, module: g.moduleKey || null,
            pages: (g.children || []).filter(c => c.path !== "/logout").map(pageOf),
        })),
    })),
};
const file = resolve(process.cwd(), "../shulecloud360-app/assets/apps.json");
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`wrote ${out.sidebar.length} sidebar groups and ${out.apps.length} apps to ${file}`);
