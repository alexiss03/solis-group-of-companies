# Solis Orders & Services

A public company request portal and protected merchant order workspace. The 30 public company profiles are seeded from the Solis public portfolio. The existing inventory CMS remains private.

## Customer flow

- `/`: company directory.
- `/companies/<slug>`: public order or service request form.
- `/track/<order-id>#<private-key>`: customer tracking page. The key stays in the URL fragment and is sent only in an API header; it is not a query parameter.
- Requests arrive as New and await company confirmation. Submissions require contact consent, are rate limited by contact/connection, and are idempotent for retries.
- Tracking returns request details and public progress events. It never returns internal notes, operator emails, tracking hashes, or customer contact fields.
- No payments, automatic email notifications, or automatic stock deductions are implemented. Customers keep their tracking link; open inboxes and trackers refresh every 30 seconds.

## Merchant flow

- `/merchant` and `/merchant/<slug>` require ChatGPT sign-in.
- The workspace owner is authorized by the verified Sites identity email in `PORTAL_ADMIN_EMAIL`. Operators are authorized by company-specific email grants in Supabase Postgres, checked on every read and write.
- Owner-only Manage team access can grant, revoke, or restore merchant access and pause/resume public requests. It does not send invitation emails or grant inventory/employee/supplier access.
- Operators review contacts and request details, add customer-facing or internal updates, and move requests through New, Confirmed, In progress, Ready, and Fulfilled. Cancellation requires a customer update.
- Fulfillment requires an explicit confirmation and a completion note. Terminal status changes cannot be reversed. Updates and audit events are atomic and version-checked.
- Order lists use stable cursor pagination; older records remain available.

## Private CMS connection

Production stores all company profiles, requests, merchant grants, audit events, company records, suppliers, employees, inventory and stock movements in the dedicated Supabase project `iwerojysjfqeqxxokzmd` (Singapore). Both Sites send verified server-side identities to its `solis-backend` Edge Function. The CMS additionally checks the owner email. The Edge Function enforces company-level authorization before querying the private `solis` schema.

The Edge Function authenticates each Site with a separate high-entropy server credential; only one-way hashes are stored in Postgres. Direct client access to every table is denied through schema/table privileges and RLS policies. Browser code receives neither backend credentials nor database credentials. Database connections use `SUPABASE_DB_URL`, a built-in Edge Function secret, with a bounded pool and prepared statements disabled. Multi-statement stock changes and fulfillment events run in Postgres transactions; public submission limits also acquire a transaction advisory lock.

Runtime values are configured through Sites, not source files:

- `SOLIS_SUPABASE_BACKEND`: deployed Edge Function HTTPS URL.
- `SOLIS_SUPABASE_BACKEND_KEY` (secret): distinct per Site, with a hash registered in the private database.
- `COMMERCE_BRIDGE_KEY` (secret): authenticated maintenance bridge for public company profile sync.
- `PORTAL_ADMIN_EMAIL` (secret): owner identity email for the portal.

The CMS also retains `COMMERCE_ADMIN_EMAIL`, `COMMERCE_ORIGIN`, and the bridge key for local development. Its audience remains owner-private. When the Supabase runtime URL is configured, failed upstream requests return an error; they do not write to a second database. Hosted D1 is retained only as the pre-migration snapshot. Public company identities can be refreshed with the bridge sync endpoint, preserving intake pause settings.

## Development and verification

Use the Sites starter workflow, D1 binding `DB`, Drizzle migrations, and a separate local database. Local preview identity is the starter's mock ChatGPT identity. Ignored `.dev.vars` contains development-only connection values.

`node --test tests/commerce.test.mjs` checks company-level permissions, revoked access, idempotency, private tracking, public/internal note separation, explicit fulfillment, terminal transitions, conflict handling, rate limits, origin checks, paused intake, and stable pagination. Local browser QA uses fictional preview requests only; test orders are not copied into the live database.

## Supabase source and verification

`supabase/migrations/` records the applied private schema and explicit client denial policies. `supabase/functions/solis-backend/` contains the deployed handler, pinned Postgres driver, and database adapter. Copies of the pure CMS and commerce rule modules are committed alongside it so the Edge Function can be deployed independently. Refresh those copies from `app/lib/commerce-store.ts` and the CMS `app/lib/cms-store.ts` when business rules change, retaining the adapter type import.

Postgres tests reuse the existing behavioral cases with PGlite instead of SQLite:

```
cd supabase/tests
npm ci
npm test
```

The test dependency is pinned in a separate lockfile. Tests create isolated databases and close them after completion; no test records are sent to the hosted database. `scripts/verify-supabase.mjs` performs read-only hosted connection and authorization checks using hidden stdin credentials.

Migration verification found 30 live public company profiles and no operational records or merchant grants. Public profiles and intake settings were copied without local preview records. Security advisors returned no findings after the explicit deny policies were applied.


## Merchant products, location, and delivery

Select a company in the order workspace and open **Merchant setup**. Assigned company operators and the owner can save a public business location, delivery/service scope and areas, supported arrangements (Pickup, Delivery, On-site, Online), and delivery conditions. No actual merchant addresses, prices, or products are fabricated or seeded.

The company catalog supports products and services with fixed prices, starting prices, or quotes, a currency and pricing unit, minimum/maximum lead times in hours/days/weeks, and available/paused status. Saves use version checks to avoid overwriting another operator's changes. Paused offerings are hidden from new requests; existing request history stays available.

Customers select an offering on the company page, see price/lead time/coverage, and choose only arrangements supported by that merchant. Delivery and on-site requests require coverage confirmation. The backend rejects stale listing/coverage versions and uses the server's price. Each request stores a permanent public snapshot of the offering and estimated amount, shown in the inbox and private tracking page. Changes to the catalog do not rewrite submitted orders. Coverage is described by the merchant and confirmed during review; there is no automatic geographic or shipping-fee calculation. Lead times begin after merchant confirmation. Prices exclude separately agreed delivery fees and extras.

The source includes a D1 preview migration and a matching Supabase migration. The hosted tables stay in the private `solis` schema with RLS and direct client access denied.
