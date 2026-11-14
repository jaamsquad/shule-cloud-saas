# M-PESA (Safaricom Daraja) Integration

ShuleCloud ships a complete, tenant-isolated M-PESA integration covering
STK Push, C2B (Till/Paybill), Pull Transactions reconciliation, Transaction
Status reconciliation, Reversal, and B2C disbursement.

Code lives in:

- `src/services/mpesa.service.ts` — pure Daraja client (STK, C2B register,
  Pull, Status, Reversal, B2C). Config-agnostic.
- `src/services/mpesaAccounts.service.ts` — per-tenant `mpesa_accounts`
  (multiple Paybills/Tills per school; one is `isDefault`).
- `src/services/c2bInbox.service.ts` — C2B validation + confirmation ingest,
  shortcode→tenant resolution, student matching, allocation, duplicate
  guard, unmatched queue, soft-reverse.
- `src/services/autoSync.service.ts` — scheduled Pull sync (5 min).
- `src/routes/mpesa.routes.ts` — public callbacks (exempt from tenancy):
  STK, C2B validation/confirmation, status/reversal/B2C result callbacks,
  pull result, timeout.
- `src/routes/mpesaOps.routes.ts` — admin surfaces: initiate reversal,
  initiate B2C, on-demand status query, pending-STK sweep, super-admin
  cross-tenant monitoring.
- `src/routes/integrations.routes.ts` — settings UI backend (test API,
  register C2B URLs, register Pull).
- Frontend settings UI: `frontend/src/pages/tenant/modules/integrations/MpesaAccounts.tsx`.

## Tenant isolation model

Every tenant has its own MongoDB database (`<subdomain>db`) resolved by
`src/middleware/tenancy.ts`. A tenant's M-PESA accounts live in that DB
in the `mpesa_accounts` collection — multiple per school, each with its
own Consumer Key/Secret, Shortcode, Passkey, Till/Paybill txType,
Initiator, and (optionally) a separate C2B Consumer Key/Secret for a
split Daraja app.

The platform-level meta DB holds:

- `mpesa_transactions` — every STK the platform initiated (fees, wallet,
  SMS top-up, biz-doc invoices, subscription), with `tenantDbName`.
- `c2b_inbox` — every C2B payload received, with `tenantDbName`
  resolved by matching `BusinessShortCode` against each account's
  `shortcode`, `tillNumber`, or `registeredShortCode`.
- `mpesa_status_results`, `mpesa_pull_results`, `mpesa_reversals`,
  `mpesa_b2c`, `mpesa_code_verifications` — callback archives and
  async op state.

Callbacks are **not trusted on tenant identity from the payload**. We
resolve the tenant from the registered shortcode on `c2b_inbox` ingest
and from our own `checkoutRequestId` on STK — never from a header or
body claim.

## Payment methods

### A. STK Push
Entry: parent portal → `/portals/FeesPay` → calls `initiateStkTopup`
(mpesaAccounts.service). Picks the tenant's default account (or an
explicit `accountId`), creates `mpesa_transactions` row with purpose
`fees` | `wallet` | `sms` | subscription-side-effects, pushes STK.

The STK callback (`/mpesa/callback` and `/pesa/callback`) finds the row
by `checkoutRequestId`, applies the appropriate side effect
(`applyMpesaPayment`, `creditWallet`, `creditSmsWallet`, or business
invoice), guarded by `applied != true` idempotency.

Pending-STK sweep (`mpesaOps.sweepPendingStk`) runs every 2 min from
`server.ts` as a safety net for lost callbacks — `stkQuery` → reconcile.
Terminal failures mark the row `failed` so the UI stops spinning.

### B. C2B
C2B URL registration: `POST /api/v1/mpesa-accounts/:id/register-c2b`
(integrations.routes) — registers the account's `shortcode` (or an
override store number) to `/pesa/c2b/validation` and
`/pesa/c2b/confirmation`.

Validation: `c2bInbox.service.validateC2B` — fail-open by default; a
school can enable strict validation to reject payments whose
`BillRefNumber` matches no student.

Confirmation: `c2bInbox.service.ingestC2B` — idempotent on
`TransID`, resolves `tenantDbName` from shortcode, runs
`findStudentMatches` across admission number, invoice number, parent
phone, and configured matching rules; a single match → `allocate` to
oldest outstanding invoice (overpayments → `fee_credits`); zero or
multiple matches → row stays `status: unmatched` in the Payment Inbox
where finance can assign it.

### C. Transaction Status
On-demand: `POST /api/v1/mpesa/ops/status-query` with
`checkoutRequestId` OR `transactionId`. STK uses in-band `stkQuery` and
reconciles atomically; C2B/other uses async `transactionStatus` whose
result lands at `/pesa/transaction-status/result` and populates
`mpesa_code_verifications` (keyed by receipt number).

### D. Reversal
Soft reversal (ledger-only, immediate): `POST /payments/:id/reverse`
(fees.routes → `c2bInbox.service.reverse`). Restores the student's
balance, keeps the original payment record, writes an audit entry.

Daraja reversal (also claws back on Safaricom's side): `POST /api/v1/mpesa/ops/reverse`
with `transactionId`, `amount`, `reason`, optional `accountId`.
Pre-records to `mpesa_reversals` with `status: pending`, then calls
Daraja's `TransactionReversal`. The verdict posts to
`/pesa/reversal/result` → updates the row to `completed` / `failed`.

Requires the account's `initiator` + pre-encrypted
`securityCredential` set. The Daraja app must have the Reversal
product.

### E. B2C (optional)
Guarded per-tenant by `mpesa_settings.b2cEnabled`. `POST /api/v1/mpesa/ops/b2c`
with `phone`, `amount`, `commandId` (`BusinessPayment` default),
`remarks`. Pre-records to `mpesa_b2c`, calls Daraja's B2C v3; result
posts to `/pesa/b2c/result`.

Requires the Daraja B2C product, operator cert, and sufficient float.
Keep OFF until Safaricom has approved it on your Paybill.

## Super-admin monitoring

- `GET  /api/v1/owner/mpesa/overview` — totals (24h/30d), per-tenant
  STK/C2B counts, last successful callback timestamps, pending count,
  unmatched C2B count. Reveals no secrets.
- `GET  /api/v1/owner/mpesa/errors` — recent STK failures across tenants.
- `POST /api/v1/owner/mpesa/sweep-now` — fire the pending-STK sweep.

## Environment variables

```
MPESA_CALLBACK_URL=https://api.shulecloud.co.ke
    # Public base URL. All callbacks are mounted under /v1/. Must be
    # HTTPS in production, must not contain the words
    # mpesa/safaricom/exe/cmd/sql/query (Daraja refuses them).
JWT_SECRET=…                    # tenant users
OWNER_JWT_SECRET=…              # super-admin
```

Per-tenant credentials (set in Settings → M-PESA Accounts, encrypted
at the frontend layer and stored in `mpesa_accounts`):

- `consumerKey`, `consumerSecret` — primary Daraja app
- `c2bConsumerKey`, `c2bConsumerSecret` — optional, if Safaricom
  issued a separate C2B app
- `shortcode`, `tillNumber` (if Buy Goods)
- `passkey` (STK)
- `txType` — `CustomerPayBillOnline` | `CustomerBuyGoodsOnline`
- `initiator`, `securityCredential` — only needed for Reversal / B2C

## Testing against Daraja sandbox

1. Create a Daraja sandbox app and grab the sandbox Consumer Key / Secret.
2. In the school's **Settings → Integrations → M-PESA Accounts**, create
   an account with `env: sandbox`, sandbox shortcode (`174379` for STK,
   `600xxx` for C2B tests), the sandbox passkey, and `txType:
   CustomerPayBillOnline`.
3. Register C2B URLs — the UI shows the URL about to be registered.
4. Test STK: parent portal → Pay Fees → `254708374149` (Daraja test MSISDN).
5. Test C2B: use Daraja's C2B Simulator with the sandbox shortcode.
6. Confirm the `mpesa_transactions` row flips to `applied: true`, the
   `payments` row is written in the tenant DB, the invoice balance drops,
   and the parent gets the SMS receipt.

See `backend/scratch/mpesa-sandbox-smoke.ts` for a scripted end-to-end
sandbox test (not run in CI — it needs real credentials).

## Known limits

- B2C and Reversal need an operator certificate issued by Safaricom; a
  school must generate `securityCredential` offline from its cert.
- Pull Transactions requires the Pull product and a one-time registration.
- Production rollout requires Safaricom's final go-live approval per
  shortcode and a public HTTPS callback endpoint.
