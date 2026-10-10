// Proves permissions fit apps exactly (run after changing apps, pages or permissions):
//   cd frontend && npx tsx --tsconfig tsconfig.app.json scripts/check-permissions.ts
import { APPS, appModuleKeys, appForCode, CORE_APPS } from "../src/lib/apps";
import { CAPABILITIES, DEFAULT_ROLE_PERMISSIONS as FRONT_DEFAULTS } from "../src/lib/permissions";
import { PAGE_PERMISSIONS, navItems } from "../src/components/navItems";
import { APP_MODULES, CODE_TO_MODULES, DEFAULT_ROLE_PERMISSIONS as BACK_DEFAULTS, permsToModules, CORE_APPS as BACK_CORE } from "../../backend/src/lib/permissions";
import { APP_API_PREFIXES } from "../../backend/src/middleware/appGate";

const problems: string[] = [];
const bad = (m: string) => problems.push(m);
const capCodes = new Set(CAPABILITIES.map(c => c.code));
const pageCodes = new Set(PAGE_PERMISSIONS.flatMap(g => g.perms.map(p => p.code)));
const navModules = new Set(navItems.map(n => n.moduleKey).filter(Boolean) as string[]);

// 1. web and server agree on the apps
for (const a of APPS) {
    const f = appModuleKeys(a).sort().join(","), b = (APP_MODULES[a.key] || []).slice().sort().join(",");
    if (f !== b) bad(`app ${a.key}: web modules [${f}] ≠ server [${b}]`);
    for (const m of appModuleKeys(a)) if (m !== "dashboard" && !navModules.has(m)) bad(`app ${a.key}: module ${m} has no sidebar section`);
}
if (CORE_APPS.join() !== BACK_CORE.join()) bad("core apps differ between web and server");

// 2. every capability belongs to one app and opens only that app's modules
const seen = new Set<string>();
for (const c of CAPABILITIES) {
    if (seen.has(c.code)) bad(`capability ${c.code} listed twice`); seen.add(c.code);
    if (!APP_MODULES[c.app]) { bad(`capability ${c.code}: unknown app ${c.app}`); continue; }
    const mods = CODE_TO_MODULES[c.code];
    if (!mods) { bad(`capability ${c.code}: server has no module mapping`); continue; }
    for (const m of mods) if (!APP_MODULES[c.app].includes(m)) bad(`capability ${c.code} (${c.app}) opens ${m}, outside its app`);
    if (appForCode(c.code) !== c.app) bad(`capability ${c.code}: appForCode says ${appForCode(c.code)}`);
}
// 3. every server code is either a capability or a page permission
for (const code of Object.keys(CODE_TO_MODULES)) if (!capCodes.has(code) && !pageCodes.has(code)) {
    const prefix = code.split(".")[0];
    if (!APPS.some(a => appModuleKeys(a).includes(prefix))) bad(`server code ${code} belongs to no app`);
}
// 4. every page permission lives in exactly the app that holds its section
for (const g of PAGE_PERMISSIONS) {
    const owners = APPS.filter(a => a.groups.includes(g.group));
    if (owners.length !== 1) bad(`section ${g.group} is in ${owners.length} apps`);
    for (const p of g.perms) {
        const opened = permsToModules([p.code]).filter(m => m !== "dashboard");
        if (owners[0] && !opened.every(m => APP_MODULES[owners[0].key].includes(m))) bad(`page ${p.code} opens [${opened}] outside ${owners[0].key}`);
        if (!opened.length) bad(`page ${p.code} opens nothing on the server`);
    }
}
// 5. role templates only use known codes
for (const [role, codes] of [...Object.entries(FRONT_DEFAULTS), ...Object.entries(BACK_DEFAULTS)]) {
    for (const c of codes) if (c !== "*" && !capCodes.has(c) && !pageCodes.has(c) && !c.startsWith("app.")) bad(`role ${role}: unknown code ${c}`);
}
// 6. app switches: whole-app grants open the app; server-gated apps exist
for (const a of APPS) {
    const opened = permsToModules([`app.${a.key}`]).filter(m => m !== "dashboard").sort().join(",");
    const want = (APP_MODULES[a.key] || []).filter(m => m !== "dashboard").sort().join(",");
    if (opened !== want) bad(`app.${a.key} opens [${opened}] not [${want}]`);
}
for (const k of Object.keys(APP_API_PREFIXES)) if (!APP_MODULES[k] || CORE_APPS.includes(k)) bad(`app gate lists ${k}, which can't be switched off`);

console.log(`${APPS.length} apps · ${CAPABILITIES.length} capabilities · ${pageCodes.size} pages`);
if (problems.length) { console.log(problems.map(p => " ✗ " + p).join("\n")); process.exitCode = 1; } else console.log(" ✓ every permission fits exactly one app, web and server agree");
