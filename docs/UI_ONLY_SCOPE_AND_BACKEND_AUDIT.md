# BUYSELL — UI-only redesign contract and live catalog incident

**Date:** 2026-10-10  
**Scope:** Frontend visual design, responsive components, branding, and navigation usability ONLY.  
**Never modify without explicit separate approval:** Backend services, authentication provider, persisted user data, cart price calculations, checkout/payment orchestration, order state machine, media upload operations, or seller/supplier privileges.

## Source-of-truth branding
The previous `public/brand/buysell-primary-dark.svg` has a solid dark rectangle and white text. It must not be placed inside the white/light navbar.
Use the **actual, repository-owned BUYSELL SVG path data** from the existing source's `frontend/src/assets/brand/`:
- `buysell_primary_light.svg`: light-surface wordmark geometry, dark ink and forest green.
- `buysell_primary_dark.svg`: dark-surface wordmark geometry, white and action green.
The two current marketplace paths `public/brand/buysell-on-light.svg` and `buysell-on-dark.svg` retain those existing official path/fill values with only their solid backdrop rectangles omitted. Their only purpose is to avoid the black-square/white-square appearance reported on mobile. Replace them with the user's forthcoming authoritative ZIP brand exports where necessary. BrandLogo.jsx selects by surface.

## Confirmed product outage root cause
The marketplace code in this repository is coupled to an API deployment at `https://buysell-api-v1-2.onrender.com/api/v1`. This is NOT a frontend rendering problem. Render logs on 2026-10-10 show the service failing database resolution (`getaddrinfo ENOTFOUND`) during `GET /api/v1/health`. Public requests to its health and products endpoints returned HTTP 503. Hence this version cannot enumerate real products or sign in using that database until the existing backend connection is restored.

## Another live BUYSELL API exists — do NOT silently switch
The independently deployed `https://buysell-api-v2.onrender.com/api/v1` is currently answering public health and products endpoints. Its catalog reports real product images, categories, inventory and a reported total of 56 products as of 2026-10-10. However **v2 is not API-compatible with v1.2**:

| Area | Original v1.2 frontend | Live v2 API |
|------|------------------------|-------------|
| Public list | `GET /products?limit=...` -> `{items:[...]}` | `GET /products?limit=...` -> `{success:true,data:[...],meta:{...}}` |
| Product fields | `price`, `image_url`, `seller_id`, `stock_quantity` | `variants[].priceKobo`, `media[].url`, `store.id`, `variants[].available` |
| Sign-in | `/auth/login` issues app JWT/refresh tokens | Supabase Auth bearer token verified by v2 API (identity continuation) |
| Checkout | `POST /orders` with product list, then `/payments/flutterwave/initialize` | `POST /checkout/quotes` with saved address, `POST /orders` with quoteId and Idempotency-Key, then `POST /orders/:id/payments/flutterwave` |
| Media upload | `POST /uploads` with multipart form | `POST /media/uploads/authorize` then upload and `POST /media/assets` |

Replacing just the API base URL would *show wrong products or fail every cart/order operation*. It would violate the owner's explicit request to **leave the existing checkout, authentication, and upload systems intact**. The correct fix is to identify which complete, live system/production app should be the target and preserve that entire system rather than mixing two incompatible architectures.

## Implementation notes
- All backend and database files remain untouched by this UI redesign.
- Original `CartContext.jsx`, `CartPage.jsx`, and `CheckoutPage.jsx` were restored from main after an earlier redesign accidentally altered their monetary behavior. Responsive design now lives in CSS.
- Original React auth endpoints are preserved; screen routing remembers the user's original destination including search parameters.
- React render smoke tests and the Vercel build pass. These do not demonstrate successful real-data product fetching or end-to-end checkout.
- No placeholder product data may be passed off as real inventory. No fake Google login button may be shown unless its actual authentication flow is configured.

## Completion requirements
1. Apply the user's authoritative logo ZIP to all surfaces and favicon.
2. Confirm a working, consistent production backend with preserved user identities and product inventory. No silent cross-system migrations.
3. Test product media, actual account restoration, seller onboarding, cart, payment callback, order creation/tracking, uploads, and all role screens against that ONE backend before production promotion.
4. Keep the redesign on its feature branch until verified, and do not overwrite existing production data.
