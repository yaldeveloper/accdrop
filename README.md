# AccDrop — اک‌دراپ

Website for **accdrop.ir**: a curated, premium store for AI subscriptions and professional software.

## Stack
- Next.js (App Router) + React + TypeScript
- Plain CSS design system in `app/globals.css` (obsidian / off-white / Signal Lime)
- Self-hosted fonts via Fontsource (Vazirmatn + Inter), so the site does not depend on Google Fonts from Iran

## Run
```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Structure
- `app/` — layout (RTL, metadata, favicon) and the home page
- `components/brand.tsx` — wordmark, «پ» glyph, the three-dot signature, icons
- `components/sections.tsx` — Hero, Collection, Drop, Shield, Club, Voices, Concierge, Footer
- `components/sheet.tsx` — product → cart → checkout → confirmation flow
- `components/store.tsx` — cart / sheet / search state (cart is kept in localStorage)
- `lib/catalog.ts` — products, plans, current drop (**sample data**)
- `public/brand/` — logo SVGs

## Backend
- `lib/server/` — Postgres (`db.ts`, tables are created on first request), login codes and sessions (`auth.ts`),
  Kavenegar SMS (`sms.ts`), Zarinpal (`pay.ts`), orders, gift-code stock and fulfilment (`orders.ts`).
- `app/api/` — auth, orders, payment callback, discount check, reseller; `app/api/admin/` for the panel.
- `/admin` — orders, gift-code stock, resellers, users, discount codes. Open to the mobiles in `ADMIN_MOBILES`.
- Prices are always computed on the server from `lib/catalog.ts`; what the browser sends is ignored.
- Settings are in `.env.example`. Without SMS or gateway keys the site runs in demo mode
  (login code 12345, built-in test gateway), so it can be tried end to end with just `DATABASE_URL`.

## Not wired yet
- Editing prices from the admin panel (prices still live in `lib/catalog.ts`)
- Virtual-number supplier API (numbers are entered by an admin for now)
- Telegram / Instagram links and eNamad badge
