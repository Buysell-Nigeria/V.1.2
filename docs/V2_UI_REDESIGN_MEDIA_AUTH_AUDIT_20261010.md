# BUYSELL connected storefront — live-data and authentication audit
Date: 2026-10-10

## Frontend changes in this branch
- React page routes from the existing BUYSELL V2 frontend preserved.
- The old video **removed from the homepage hero**; existing seller video previews still have their own section and product detail media.
- Hero advances every four seconds (except motion-reduced mode or hover/hidden tab), eight feature/product slides plus current real campaign posters when returned by the API.
- Custom illustrated slide scenes for protection, delivery, order tracking, sourcing and opening a store. Slides link to actual working pages.
- Product cards use a shopping cart icon rather than a standalone plus; buyer wishlist button invokes the existing API.
- Responsive product gallery accepts multiple images, thumbnails, swiping and zoom. Missing URLs show an honest, designed media-unavailable state without huge broken alt text.
- Checkout quote, order creation/payment authorization, cart pricing, Supabase auth, upload and backend **business logic are not changed**.

## Verified live product and campaign API
Source: existing backend `https://buysell-api-v2.onrender.com/api/v1`.
The Vercel V2 storefront preview proxies `/api/v1/*` to the same backend, avoiding browser CORS.

- Public `GET /products?limit=100` returned 56 products (54 with image media and 1 with video media in the sample).
- Public `GET /home` returned eight categories, 12 latest products and **zero active campaign records**.
- On October 10 a live-browser check displayed 12 real product cards, category listings, product details and functioning slide navigation.
- The banner/feed cannot honestly show promotions that the API does not return. This redesign leaves the paid campaign image/video rendering intact for real future active campaigns.

## Why some original product photos cannot be displayed
An independent browser request to an image already stored in the V2 product record returned:
`HTTP 404` with `{"error":"not_found","message":"Object not found","code":"NoSuchKey"}`.
Several other seller image URLs returned errors as well. This is missing content at the existing remote Supabase Storage origin, **not** a React image renderer problem.
Frontend fallback improves visual quality but **does not restore deleted or moved seller files**. Restore original objects to the referenced public paths or update the existing product media records with correct URLs through the authorized media management workflow. Do not synthesize or substitute unrelated stock photos for actual seller inventory.

## Multiple-photo galleries
All 56 products returned in the current public list have at most one media item per product. The new gallery is ready for multiple images, but actual thumbnails depend on the backend/legacy data making those files available. The legacy Supabase `products.images` array is a possible source of extra photos via the existing legacy bridge; the old project needs authorized access and working image objects.

## Existing accounts / Google sign-in / saved carts
The original BUYSELL V2 authentication uses Supabase Auth JWTs and verifies the identity on the existing backend.
- Vercel project's preview has the correct `VITE_SUPABASE_URL` set, but `VITE_SUPABASE_PUBLISHABLE_KEY` (or legacy `VITE_SUPABASE_ANON_KEY`) is missing. No auth key should be fabricated or replaced with the publishable key from a different Supabase project.
- The app's Google OAuth and password-login UI preserve the user's intended return route (e.g. checkout), including through `/auth/callback`.
- Supabase Auth must have Google provider enabled and the frontend preview/callback URL allowed. Auth remains unavailable until the correct project key and redirect configuration are supplied.
- The **original V2 cart context and V2 checkout/payment APIs remain intact**. Following a verified authenticated session, the cart is read from the existing backend and local guest items are merged. This does not guarantee migration of carts previously stored only on another origin or un-migrated legacy database.

## Production gate
Do not merge to main/promote production until real Google OAuth, existing account sign-in, stored carts, checkout quote/payment callback, seller media upload, and the restored image URLs are tested with the correct external configuration. This branch intentionally changes no backend code, database tables, Paystack/Flutterwave transaction handlers, or object storage records.
