# SNITCH

### A modern marketplace for discovering, selling, and shopping products

Snitch is a full-stack e-commerce application with separate React and Express applications. Customers can browse products, manage a cart and wishlist, pay online, and review their orders. Sellers can publish products, add variants, and manage fulfillment.

<p align="center">
  <strong>React · Vite · Redux Toolkit · Express · MongoDB · Razorpay</strong>
</p>

---

## Contents

- [Highlights](#highlights)
- [Technology stack](#technology-stack)
- [Repository layout](#repository-layout)
- [Getting started](#getting-started)
- [Environment configuration](#environment-configuration)
- [Available scripts](#available-scripts)
- [Application routes](#application-routes)
- [API overview](#api-overview)
- [Notes](#notes)

## Highlights

### For shoppers

- Browse the product catalog and view product details and variants.
- Register, sign in, or continue with Google.
- Add products to a cart or wishlist.
- Create a Razorpay checkout order and verify payment.
- Review order history and manage account details.

### For sellers

- Access seller-only pages and endpoints.
- Create products and upload product images.
- Add variants to existing products.
- View seller products and orders.
- Update order fulfillment status.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, JavaScript / JSX, Vite 8 |
| Navigation | React Router 7 |
| Client state | Redux Toolkit, React Redux |
| Styling | Tailwind CSS 4, `@tailwindcss/vite`, CSS |
| HTTP | Axios |
| Backend | Node.js, Express 5, JavaScript ES modules |
| Database | MongoDB, Mongoose 9 |
| Authentication | JSON Web Tokens, bcryptjs, cookie-parser |
| Google sign-in | Passport, `passport-google-oauth20` |
| Payments | Razorpay Node SDK, `react-razorpay` |
| Image uploads | Multer memory storage, ImageKit Node SDK |
| Validation and logging | express-validator, Morgan |
| Cross-origin support | CORS |
| Frontend tooling | ESLint 9, Vite React plugin |

`socket.io-client` is included in the frontend dependencies, but no active Socket.IO flow is currently wired into the application source.

## Repository layout

```text
Snitch/
├── Backend/
│   ├── server.js                  # Loads configuration, connects to MongoDB, starts API
│   └── src/
│       ├── app.js                 # Express app, middleware, OAuth, and API mounts
│       ├── config/                # Environment configuration and database connection
│       ├── controllers/           # Request handlers
│       ├── dao/                   # Data access helpers
│       ├── middlewares/           # Authentication and role checks
│       ├── models/                # Mongoose schemas
│       ├── routes/                # HTTP route definitions
│       ├── services/              # Payment and image-storage integrations
│       └── validator/             # Request validation
└── Frontend/
    ├── public/                    # Static assets
    └── src/
        ├── app/                   # Application setup, routes, store, and styles
        └── features/              # Auth, products, cart, wishlist, and orders
```

## Getting started

### Prerequisites

- Node.js and npm
- A MongoDB database
- Google OAuth credentials
- An ImageKit private key
- Razorpay API keys

### 1. Install dependencies

Run these commands from the repository root:

```bash
cd Backend
npm install

cd ../Frontend
npm install
```

### 2. Configure the backend

Create `Backend/.env` and add the variables listed in [Environment configuration](#environment-configuration). Keep this file private and do not commit real credentials.

### 3. Start the API

From `Backend/`:

```bash
npm run dev
```

The API listens on port `3000` by default. The root health route is `GET http://localhost:3000/`.

### 4. Start the frontend

In a second terminal, from `Frontend/`:

```bash
npm run dev
```

Vite serves the frontend at `http://localhost:5173`. Its development proxy forwards `/api` requests to `http://127.0.0.1:3000`.

## Environment configuration

The backend validates the required values at startup. Set these in `Backend/.env`:

| Variable | Required | Purpose |
| --- | :---: | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign and verify authentication tokens |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Yes | OAuth callback URL; local callback route is `/auth/google/callback` |
| `IMAGEKIT_PRIVATE_KEY` | Yes | Server-side ImageKit upload credential |
| `RAZORPAY_KEY_ID` | Yes | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Yes | Server-side Razorpay secret |
| `PORT` | No | API port; defaults to `3000` |
| `NODE_ENV` | No | Runtime mode; defaults to `development` |

Example shape (replace every placeholder with your own value):

```dotenv
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=<long-random-secret>
GOOGLE_CLIENT_ID=<google-oauth-client-id>
GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
IMAGEKIT_PRIVATE_KEY=<imagekit-private-key>
RAZORPAY_KEY_ID=<razorpay-key-id>
RAZORPAY_KEY_SECRET=<razorpay-key-secret>
PORT=3000
NODE_ENV=development
```

Configure the Google OAuth client with the same callback URL provided in `GOOGLE_CALLBACK_URL`. Never expose private keys or secrets in frontend code.

## Available scripts

### Backend (`Backend/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API using nodemon |
| `npm start` | Start the API with Node.js |
| `npm test` | Placeholder only; no backend test suite is configured |

### Frontend (`Frontend/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Application routes

| Path | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Product catalog |
| `/product/:productId` | Public | Product details |
| `/register`, `/login` | Public | Account registration and sign-in |
| `/cart` | Signed in | Shopping cart and checkout |
| `/wishlist` | Signed in | Saved products |
| `/orders` | Signed in | Customer order history |
| `/profile` | Signed in | Account profile |
| `/order-success` | Public | Payment completion view |
| `/seller/create-product` | Seller | Create a product |
| `/seller/dashboard` | Seller | Manage seller products |
| `/seller/product/:productId` | Seller | View and manage a seller product |

## API overview

All API routes are mounted on the backend at `/api`.

| Base path | Main operations |
| --- | --- |
| `/api/auth` | Register, log in/out, retrieve the current user, and begin Google OAuth |
| `/api/products` | Browse products, retrieve product details, create seller products, manage variants |
| `/api/cart` | Retrieve and update the cart; create and verify payment orders |
| `/api/wishlist` | Retrieve, add, and remove wishlist products |
| `/api/orders` | Retrieve customer orders; retrieve seller orders and update fulfillment |

Authentication and seller-only operations are protected by backend middleware. Product image uploads accept up to seven images per request, with a 5 MB limit per file.

## Notes

- The local frontend proxy and backend CORS origin are configured for `localhost:5173` and the API on port `3000`. Update both configurations as appropriate for other environments.
- The backend requires valid external-service credentials as well as a reachable MongoDB instance before it can start.
- No frontend test command or backend test suite is currently configured.
