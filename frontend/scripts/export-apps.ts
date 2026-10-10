// Writes the apps catalogue (apps → sections → pages, with module keys and page permissions)
// for the ShuleCloud 360 mobile app, so the phone and the web always list the same apps.
//   cd frontend && npx tsx --tsconfig tsconfig.app.json scripts/export-apps.ts
import { writeFileSync } from "fs";
import { resolve } from "path";
import { APPS, APP_CATEGORIES, appGroupItems, appModuleKeys } from "../src/lib/apps";
import { CREATE_PATHS } from "../src/components/navItems";

const out = {
    generatedAt: new Date().toISOString().slice(0, 10),
    categories: APP_CATEGORIES,
    apps: APPS.map(a => ({
        key: a.key, name: a.name, description: a.description, category: a.category, color: a.color,
        path: a.path || null, modules: appModuleKeys(a),
        sections: appGroupItems(a).map(g => ({
            label: g.label, module: g.moduleKey || null,
            pages: (g.children || []).filter(c => c.path !== "/logout").map(c => ({
                label: c.label, path: c.path, perm: c.pagePerm || null, create: !!(c.create || CREATE_PATHS.has(c.path)),
            })),
        })),
    })),
};
const file = resolve(process.cwd(), "../shulecloud360-app/assets/apps.json");
writeFileSync(file, JSON.stringify(out, null, 1));
console.log(`wrote ${out.apps.length} apps to ${file}`);
