# Solis Company Management

Private, persistent company operations CMS. The existing public showcase remains at https://solis-group-of-companies.cynammon.chatgpt.site. This separate Site must remain owner-private because it stores suppliers, employee contact details, stock quantities, and internal unit costs.

## Features

- A company directory, initially copied from the 31-company public portfolio on the first signed-in visit.
- Add, edit, archive, and restore suppliers, employees, inventory items, and companies.
- Company filters, search, low/out-of-stock views, and CSV export of the current view.
- Inventory SKU, unit, supplier, storage location, reorder level, cost, and currency.
- Atomic stock receipts, issues, and adjustments with immutable movement records and conflict checks.
- Stock cannot go negative. Positive-stock items cannot be archived. Archived SKUs remain reserved.
- A company with active operational records cannot be archived.

Operational records start empty. No supplier, employee, or stock sample data is included. Public website content is edited separately; changes in this CMS are private and do not publish to the portfolio.

## Storage and access

Supabase Postgres in project `iwerojysjfqeqxxokzmd` stores hosted records across devices through the protected `solis-backend` Edge Function. The retained D1 binding is used by unconfigured local previews only. All API operations require ChatGPT identity, enforce owner isolation, validate fields and company relationships, and reject cross-origin mutations. The private Sites audience is an additional access boundary. `/api/cms/initialize` imports only public company identities, without changing existing edits; it does not alter existing operational records. The stock log displays the latest 200 movements; older history is retained in the database.

Local and hosted databases are separate. Never copy test operational records into production. `tests/cms.test.mjs` uses temporary in-memory SQLite and tests data isolation, duplicate SKUs, invalid relationships, stock balances, conflict handling, archive protection, and cross-origin rejection.

## Run

Install dependencies with the Sites helper; run `npm run db:generate` after schema changes. Build to generate `dist/server/wrangler.json`, apply pending SQL migrations to the local D1 database using the starter instructions, and run `npm run dev -- --port 4192`. Loopback development uses the starter's local mock ChatGPT sign-in. Production authentication is provided by Sites.

The application does not include payroll, accounting, supplier purchasing, employee access roles, stock transfers, or automatic public portfolio publishing.

Each company has its own private subsite at `/companies/<stable-slug>/inventory`, with Overview, Suppliers, Employees, Inventory, and Stock movements pages. Slugs are preserved when company names change. Existing portfolio companies receive slugs during authenticated initialization; newly added portfolio companies are imported without replacing existing private records. The Cake Architect (Butter & Bloom) is included.

## Orders and merchant workspaces

The Orders & requests module connects to the separate public Solis Orders & Services portal through the shared protected Supabase backend. Each company has a private CMS orders view at `/companies/<slug>/orders` and a separately authenticated merchant view in the portal. The CMS remains owner-private; supplier, employee, stock, and internal cost data is never sent to the public portal. The server proxy additionally requires the verified owner email.

Merchant team access is granted per company using verified ChatGPT sign-in emails. Grants do not send email invitations. Customers submit through public company request pages, receive private tracking links, and see progress and explicit fulfillment confirmation. Inboxes refresh while open. Payments, email notifications, and automatic inventory deduction are not included.

Hosted runtime variables: `COMMERCE_ORIGIN`, `COMMERCE_BRIDGE_KEY` (secret), and `COMMERCE_ADMIN_EMAIL` (secret). Never expose the bridge credential to the browser.


## Hosted Supabase connection

`SOLIS_SUPABASE_BACKEND` is the Edge Function URL; `SOLIS_SUPABASE_BACKEND_KEY` is a secret unique to this Site. Supabase stores only its one-way hash. The server forwards the verified Sites identity, and the backend checks the owner email and restricts each operation. All operational tables are in a private schema, with direct browser access denied. The public portal has a separate credential that cannot call CMS endpoints. Failed Supabase requests never silently write to D1. Existing D1 data is retained as a pre-migration snapshot.

Schema migrations, Edge Function source, and nine Postgres workflow verification cases are maintained in the sibling Solis Orders source under `supabase/`. The existing local SQLite tests remain useful for the unconfigured preview path.


## Merchant products, location, and delivery

Select a company in the order workspace and open **Merchant setup**. Assigned company operators and the owner can save a public business location, delivery/service scope and areas, supported arrangements (Pickup, Delivery, On-site, Online), and delivery conditions. No actual merchant addresses, prices, or products are fabricated or seeded.

The company catalog supports products and services with fixed prices, starting prices, or quotes, a currency and pricing unit, minimum/maximum lead times in hours/days/weeks, and available/paused status. Saves use version checks to avoid overwriting another operator's changes. Paused offerings are hidden from new requests; existing request history stays available.

Customers select an offering on the company page, see price/lead time/coverage, and choose only arrangements supported by that merchant. Delivery and on-site requests require coverage confirmation. The backend rejects stale listing/coverage versions and uses the server's price. Each request stores a permanent public snapshot of the offering and estimated amount, shown in the inbox and private tracking page. Changes to the catalog do not rewrite submitted orders. Coverage is described by the merchant and confirmed during review; there is no automatic geographic or shipping-fee calculation. Lead times begin after merchant confirmation. Prices exclude separately agreed delivery fees and extras.

The source includes a D1 preview migration and a matching Supabase migration. The hosted tables stay in the private `solis` schema with RLS and direct client access denied.
