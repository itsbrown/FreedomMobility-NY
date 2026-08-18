# Technician weekly pay form

Admin hub: `/admin` (PIN-gated, not in the public nav). Pay form: `/tech/pay`. Success: `/tech/success`.

Replaces the incomplete Replit export in `../Review/FREEDOM_MOBILITY_APP_EXPORT.md` (that dump was missing `pay-form.tsx` / `admin.tsx`, used in-memory storage, and emailed the VA inbox from a separate Express app).

## Behavior

1. Optional PIN overlay (`PUBLIC_TECH_PAY_PIN`) stored in `sessionStorage`
2. Technician name + week ending (defaults to this Saturday)
3. Piece-rate install tasks and service items (qty steppers)
4. Trips: home → job, install/service, round-trip toggle, OSRM calculate, manual miles
5. Trip is billable when **one-way** miles ≥ `mileageConfig.qualifyMilesOneWay` (default 30)
6. Sticky totals; submit emails a formatted timesheet; Copy / Print as fallback

Home address and technician name persist in `localStorage`.

## Rates (source of truth)

Admin edits live rates at `/admin/rates` (Dashboard → Pay rates, or header **Rates**).

Load order on the pay form:

1. Shared store via `GET /api/pay-rates` (Netlify Blobs)
2. This browser's `localStorage` (`fm-pay-rates`)
3. Built-in defaults in `src/data/pay-rates.ts`

Save writes localStorage always. On Netlify it also `PUT /api/pay-rates` (PIN header). Check **Rates are confirmed** to hide the draft banner.

The original Replit rates were never exported. Built-in numbers stay draft until admin confirms them.

## Files

- `src/data/pay-rates.ts` — types + default catalog
- `src/lib/pay-rates-store.ts` — load/save
- `src/lib/admin-rates-client.ts`
- `src/pages/admin.astro`
- `src/pages/admin/rates.astro`
- `src/lib/tech-pay-client.ts`
- `src/pages/tech/pay.astro`
- `src/pages/tech/success.astro`
- `netlify/functions/pay-rates.mts`
