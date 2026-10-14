# CLAUDE.md

E-commerce site for **Mynds (มายด์)**, a Thai "Hot Weather Apparel" clothing brand. Built from the Google Sheet "Website Brief - Mynds". The owners are Thai and non-technical: reply to them in Thai, plainly. See `HANDOVER.md` for history, decisions and the open-items list, and `README.md` for setup.

## Commands

- `npm run dev` — dev server (http://localhost:3000, admin at `/admin`, needs `ADMIN_PASSWORD` in `.env`)
- `npm run lint` — `tsc --noEmit` (there is no ESLint)
- `npm test` — Node test runner on `tests/*.test.ts` (pricing, catalog import, order creation)
- `npm run build && npm start` — production
- `npm run import:products -- file.csv` — import/update products from a CSV export of sheet 03_Product_Master

Run `npm run lint && npm test && npx next build` before pushing.

## Stack and constraints

- Next.js 16 App Router, React 19, Tailwind CSS 4 (`@theme` tokens and `@utility` classes in `app/globals.css`), TypeScript.
- Database: **`node:sqlite`** (built into Node ≥ 22.13), with no ORM. The schema and migrations are in `lib/db.ts` (`CREATE TABLE IF NOT EXISTS`, applied on open). On first boot the catalog is seeded from `data/product-master.csv`.
- Deployed on **Railway** with a Volume (`DATABASE_PATH=/data/mynds.db`). It must not move to serverless (Vercel), because the DB file would be lost, and it runs as a single instance.
- Files under `lib/` import each other with explicit `.ts` extensions (`allowImportingTsExtensions`). This lets `node` run `scripts/` and `tests/` directly with type stripping. Keep that, and avoid TS-only runtime syntax (enums, parameter properties) in `lib/`, because Node's strip-only mode rejects it.
- `next/font` is not used. The IBM Plex Sans Thai font comes from a Google Fonts `<link>` in `app/layout.tsx`.

## Layout

- `app/`: storefront pages, `app/api/*` route handlers, `app/admin/*`. Admin pages sit under `(panel)` and are guarded by the `isAdmin()` cookie check; mutations go through server actions in `app/admin/actions.ts`.
- `lib/catalog.ts`: converts the sheet CSV into products and variants. It normalises sizes and colours and infers category, gender and collection from the product name when the sheet is blank.
- `lib/products.ts`: listing, filters, facets, search and related products. Filtering runs in memory, which is fine for ~60 products.
- `lib/pricing.ts`: pure totals, shipping and coupon logic, shared by the cart preview (`/api/cart`) and order creation.
- `lib/orders.ts`: validation, `createOrder` (one transaction that decrements stock with a guard and recomputes prices server-side) and status changes (cancelled/refunded restocks automatically).
- `lib/site.ts`: brand and company info and contact (LINE @693ppazy). `lib/policies.ts` holds the policy texts, which are **drafts pending legal review**.
- `components/`: client UI. `CartProvider` keeps the cart in localStorage. Analytics in `analytics.ts`/`Tracking.tsx` fire GA4 and Meta Pixel only after cookie consent.
- `public/brand/`: logos (the blue logo is the CI colour #1F62AF), favicon and OG image.

## Rules

- Never trust client prices or stock. Totals must be computed by `lib/pricing.ts` from DB values.
- Never import or expose the cost column ("ต้นทุน") from the product sheet.
- Admin edits to product `status` and `featured` must survive CSV re-imports (`importProducts` only updates catalogue fields, price and stock).
- UI copy is Thai. Prices are THB and shown VAT-inclusive.
- Don't commit `.env` or `data/*.db`.
- The header uses `backdrop-blur`, so any `fixed` overlay (drawer, modal) must be rendered outside `<header>`.
