/**
 * Cloudflare-for-SaaS diagnostics. Run on the server:
 *   node scripts/cf-check.js
 * It verifies the token, zone access, SSL/Custom-Hostname permission, and whether
 * Cloudflare for SaaS is usable — printing the exact failure if any.
 */
require('dotenv').config();

const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || '';
const zoneId = process.env.CLOUDFLARE_ZONE_ID || process.env.CF_ZONE_ID || '';
const root = process.env.SAAS_ROOT_DOMAIN || '';
const target = process.env.CLOUDFLARE_SAAS_TARGET || process.env.CF_SAAS_TARGET || (root ? `cname.${root}` : '');

const API = 'https://api.cloudflare.com/client/v4';

async function cf(path, init = {}) {
    const r = await fetch(`${API}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok && data.success !== false, status: r.status, data };
}

(async () => {
    console.log('── Config ───────────────────────────────');
    console.log('token set :', token ? `yes (${token.slice(0, 4)}…${token.slice(-4)})` : 'NO');
    console.log('zoneId    :', zoneId || 'NO');
    console.log('saas root :', root || '(unset)');
    console.log('cname tgt :', target || '(unset)');
    if (!token || !zoneId) { console.log('\n❌ Missing token or zone id. Set them in .env and retry.'); return; }

    console.log('\n── 1. Token validity (/user/tokens/verify) ──');
    const v = await cf('/user/tokens/verify');
    console.log(v.ok ? '✅ token valid' : `❌ ${v.status}: ${v.data?.errors?.[0]?.message || JSON.stringify(v.data)}`);

    console.log('\n── 2. Zone read access ──');
    const z = await cf(`/zones/${zoneId}`);
    if (z.ok) console.log('✅ zone:', z.data.result?.name, '| status:', z.data.result?.status);
    else console.log(`❌ ${z.status}: ${z.data?.errors?.[0]?.message || JSON.stringify(z.data)}`);

    console.log('\n── 3. Custom Hostnames API (SSL & Certs: Edit) ──');
    const ch = await cf(`/zones/${zoneId}/custom_hostnames`);
    if (ch.ok) console.log(`✅ can list custom hostnames (${(ch.data.result || []).length} existing)`);
    else console.log(`❌ ${ch.status}: ${ch.data?.errors?.[0]?.message || JSON.stringify(ch.data)}  ← this is the permission "domains/add" needs`);

    console.log('\n── 4. Fallback origin configured? ──');
    const fo = await cf(`/zones/${zoneId}/custom_hostnames/fallback_origin`);
    if (fo.ok) console.log('✅ fallback origin:', fo.data.result?.origin || '(none set)', '| status:', fo.data.result?.status || '—');
    else console.log(`⚠️  ${fo.status}: ${fo.data?.errors?.[0]?.message || 'not set'} — set a Fallback Origin in SSL/TLS → Custom Hostnames for SSL to issue.`);

    console.log('\nDone. If step 3 fails, the token lacks "SSL and Certificates: Edit" on this zone, OR Cloudflare for SaaS is not enabled on the zone.');
})().catch((e) => console.error('Script error:', e.message));
