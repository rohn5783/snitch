# SNITCH

A fashion marketplace served by one Next.js application, with a photo-led editorial storefront and server-side commerce APIs backed by MongoDB.

## What is included

- Editorial, responsive storefront with search, collections and live product cards.
- Editorial fashion photography in the homepage hero.
- Product detail pages with real product photography, selectable backend variants and an optional drag-to-rotate GLB viewer.
- Sign in, registration, Google OAuth entry point, account profile, saved items and order history.
- Cookie-authenticated cart, delivery-address capture, Razorpay test checkout, signature verification, inventory updates and order history.
- Seller studio for product details, categories, SKU, listing availability, option pricing and stock, plus prepare/ready/dispatch/delivered order fulfillment.
- Next.js Route Handlers for authentication, products, cart, wishlist, orders, seller tools and payments.
- GSAP scroll reveals, Framer Motion entrances/transitions, keyboard-friendly controls and reduced-motion support.

## Technology

| Area | Technologies |
| --- | --- |
| Frontend | Next.js App Router, React 19, TypeScript, Sass |
| Product viewer | Three.js, React Three Fiber, Drei |
| Motion | GSAP / ScrollTrigger, Framer Motion |
| Server and API | Next.js App Router, Route Handlers, MongoDB / Mongoose |
| Payments | Razorpay |
| Images | ImageKit-backed product images |

All application code lives in this repository's root: App Router pages and API handlers in `app`, shared UI in `components`, and server-side database, authentication and commerce logic in `lib/server`. The unused Vite and Express applications have been removed.

## Run locally

### Requirements

- Node.js 20.9 or later and npm
- MongoDB and the third-party service credentials described below

Install the unified Next.js application dependencies:

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. The same Next.js server renders the site and serves `/api/*` and Google OAuth callback routes.

## Environment configuration

Keep private credentials in `.env.local` at the repository root. These values are server-only and must never use a `NEXT_PUBLIC_` prefix.

```dotenv
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<a-long-random-secret>
GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<your-google-oauth-client-secret>
IMAGEKIT_PRIVATE_KEY=<your-imagekit-private-key>
RAZORPAY_KEY_ID=<your-razorpay-key-id>
RAZORPAY_KEY_SECRET=<your-razorpay-key-secret>
NODE_ENV=development
```

Add **exactly** `http://localhost:5173/auth/google/callback` to the authorized redirect URIs in Google Cloud. The callback URL is generated from the current app origin and handled directly by Next.js. For production, add `<your-public-origin>/auth/google/callback` to the authorized redirect URIs.

MongoDB is required for catalog and account routes. Google OAuth, ImageKit and Razorpay credentials are required only for their respective features. Razorpay checkout uses the real order and signature-verification APIs; the checkout script loads only when a buyer starts checkout.

Checkout is deliberately locked to Razorpay **test mode**: configure a test key ID beginning with `rzp_test_` and its matching test secret. The server rejects live key IDs, so test purchases cannot charge a live account. Sellers publish a product with its first option and stock quantity; published listings appear in the storefront. Buyers provide a delivery address before opening Razorpay Checkout, and sellers can update each paid order item through preparation, ready, dispatched and delivered.

## Optional 3D assets

No GLB files are included. The homepage hero uses editorial photography. Product pages display the real product photos unless an actual GLB asset is configured.

For product viewers, put a GLB at `public/models/<product-id>.glb` for each product and set:

```dotenv
NEXT_PUBLIC_MODEL_ASSET_DIR=/models
```

With that setting the viewer looks for the product-ID filename. Without a configured model URL/directory, product pages show the API's actual product photographs and label them as photography; they do not claim to offer 360-degree rotation. A missing or unreadable GLB falls back to the product image. Keep models and textures compressed and reasonably sized for mobile.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Next.js on port `5173` |
| `npm run build` | Create the optimized production build |
| `npm start` | Serve the production build on port `5173` |
| `npm run typecheck` | Run the strict TypeScript check |
| `npm run lint` | Lint the active Next.js app |

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Editorial storefront and live catalog |
| `/product/:productId` | Product photos, variants and optional GLB viewer |
| `/login`, `/register` | Buyer and seller authentication |
| `/wishlist`, `/cart`, `/orders` | Buyer commerce |
| `/order-success` | Verified Razorpay completion |
| `/profile` | Signed-in account |
| `/seller/dashboard` | Seller listings and fulfillment |
| `/seller/create-product` | Create a product listing |
| `/seller/product/:productId` | Manage a listing's size, colour, price and inventory options |

## API integration

The Next.js Route Handlers use the existing MongoDB models and preserve the marketplace API contracts; commerce flows do not use demo or mock APIs:

| API path | Use |
| --- | --- |
| `/api/auth` | Registration, login, logout and current user |
| `/api/products` | Live catalog, seller-only listing creation/editing, availability and option inventory |
| `/api/cart` | Cart, delivery details, Razorpay test order creation and payment verification |
| `/api/wishlist` | Saved products |
| `/api/orders` | Buyer order history and per-item seller fulfillment progression |

Product creation and variant images are uploaded to ImageKit, limited to seven images per request and 5 MB per file.
