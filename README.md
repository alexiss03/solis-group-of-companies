# Solis Group of Companies

Source for the public company showcase, company order and service request portal, and private operations CMS.

| Project | Purpose | Live site |
| --- | --- | --- |
| [solis-group-showcase](solis-group-showcase) | Public portfolio of 31 companies | [Company showcase](https://solis-group-of-companies.cynammon.chatgpt.site/) |
| [solis-orders](solis-orders) | Public requests, customer tracking, merchant offerings, pricing, lead times, locations, delivery coverage, and fulfillment | [Orders & Services](https://solis-orders-services.cynammon.chatgpt.site/) |
| [solis-management](solis-management) | Private company inventory, suppliers, employees, stock movements, and order management | [Company Management](https://solis-company-management.cynammon.chatgpt.site/) |

## Development

Use Node.js 22.18 or newer. Each application has its own dependency lockfile and README.

The showcase is buildless: serve `solis-group-showcase/dist/` with a static HTTP server.

For either application:

```sh
cd solis-orders # or solis-management
npm ci
npm run dev
```

Local previews use the starter's mock ChatGPT sign-in and a local D1 database. Generate and apply the checked-in D1 migrations as described in the project README and Sites starter instructions. Local databases, preview records, and credentials are excluded from this repository.

## Supabase backend

The deployed applications share a protected Supabase Edge Function. Its source and schema history are in [solis-orders/supabase](solis-orders/supabase). The private `solis` schema stores merchant profiles, offerings, customer requests, status history, grants, company records, suppliers, employees, inventory, and stock movements. Direct client access is denied; verified Sites identities and company-level permissions are checked server-side.

The original Sites hosting manifests identify the existing deployments. Production runtime values are configured in Sites settings; database credentials remain in Supabase. The `.env.example` files contain placeholders only. Never commit actual backend keys, owner credentials, database URLs with passwords, or local `.dev.vars` files.

Before deploying changed business rules, synchronize the Edge Function's committed commerce/CMS rule copies with the respective application modules. Apply new migrations and verify the backend before publishing dependent UI changes. Keep the company management Site private.

## Verification

```sh
cd solis-orders
node --test tests/commerce.test.mjs
cd supabase/tests
npm ci
npm test
```

The Postgres suite uses isolated PGlite databases and covers company permissions, revoked access, stock changes, request retries, tracking privacy, fulfillment, offering prices, coverage confirmation, and immutable submitted details. The CMS also has `solis-management/tests/cms.test.mjs`.

## Current behavior

Merchants configure their public business details and available products/services under **Merchant setup**. Customers choose an offering or send a custom request. Operators confirm availability, update progress, and explicitly confirm fulfillment. Customers follow a private tracking link. Payments, automatic email notifications, automatic geographic shipping validation, and automatic inventory deductions are not implemented.
