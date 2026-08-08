# BUYSELL full UI redesign plan

This branch converts the current functional V1.2 shell into the approved BUYSELL brand system while preserving the existing API boundaries and role authorization.

## Source of truth
- BUYSELL Brand Guidelines + UI/UX Redesign v1.0 (Aug 2026)
- BUYSELL Brand Package v1 assets and tokens
- Two-column product-grid reference package supplied for mobile and dashboard flows
- Existing V1.2 feature-parity map and React routes

## Rules
1. Preserve working API contracts while changing presentation.
2. Buyer-facing pages never expose supplier discovery or supplier data.
3. Seller workspaces may access supplier sourcing/dropshipping routes after authorization.
4. Admin can govern marketplace, seller, supplier, payout, KYC, dispute, ad, broadcast and analytics operations.
5. Mobile product discovery uses a two-column grid; desktop expands responsively.
6. Inter is the interface family. BUYSELL logo assets are used directly rather than recreated with text.
7. Forest Green #0B6B3A is the primary trust color, Action Green #31A24C is reserved for strong actions/highlights, and Deal Yellow #F4B942 is promotional only.
8. Payment, verification and delivery state must stay visible at the decision point.

## Delivery sequence
### Phase 1 — public marketplace foundation
- Global brand tokens and typography
- Approved logo in navigation
- Marketplace header/search/navigation
- Homepage hero, trust strip, categories and live product grids
- Search/category listing and filters
- Two-column mobile product cards

### Phase 2 — buyer commerce
- Product details and seller trust
- Cart and checkout
- Payment callback states
- Orders + tracking
- Messages, wishlist, compare, reviews
- Account, addresses, KYC and disputes

### Phase 3 — seller workspace
- Dashboard overview
- Product create/edit/list
- Orders and fulfillment
- Analytics and payouts
- Coupons and ads
- Storefront settings
- Supplier sourcing, RFQ and dropshipping
- Team/manager delegation

### Phase 4 — supplier workspace
- Supplier onboarding/profile
- Catalog management
- Seller connections
- Supplier orders and fulfillment visibility
- Strict role gating so buyer routes cannot enumerate suppliers

### Phase 5 — admin, manager and rider
- Admin overview, users, sellers, KYC, disputes, payouts, receipts, ads, broadcasts, upcoming products, audit and analytics
- Seller-manager delegated scopes
- Rider deliveries, proof/status and earnings

### Phase 6 — migration + production hardening
- Import original Supabase export into Neon PostgreSQL using the repository's migration tooling
- Replace Supabase auth/functions with the existing Express/JWT/PostgreSQL modules
- Migrate storage objects to production object storage
- Integration tests and role-boundary tests
- Vercel marketplace/landing deployment and Render API deployment
