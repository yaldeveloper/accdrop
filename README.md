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

## Not wired yet
- Real catalogue and prices (admin panel / API)
- Payment gateway (e.g. Zarinpal) and server-side orders
- Order tracking API, SMS, Club accounts
- Telegram / Instagram links and eNamad badge
