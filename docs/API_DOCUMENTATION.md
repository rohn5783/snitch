# SNITCH — API Documentation (OpenAPI 3.0 Standard)

**Gateway Base URL:** `/api`  
**Authentication Scheme:** Cookie-based HttpOnly JWT (`token`) & Bearer token (`Authorization: Bearer <token>`)  
**Specification Endpoint:** `GET /api/openapi.json`  

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new buyer or seller account.
- **Access:** Public (Rate limited: max 15 requests per 15 min per IP)
- **Request Body:**
  ```json
  {
    "fullname": "Alex Mercer",
    "email": "alex@snitch.co",
    "contact": "9876543210",
    "password": "Password123!",
    "isSeller": false
  }
  ```
- **Responses:**
  - `201 Created`: User created and HttpOnly session cookies set (`token`, `refresh_token`).
  - `400 Bad Request`: Validation failure or email/contact collision.

### `POST /api/auth/login`
Authenticates a user with email and password.
- **Access:** Public (Rate limited: max 10 requests per 10 min per IP)
- **Request Body:**
  ```json
  {
    "email": "alex@snitch.co",
    "password": "Password123!"
  }
  ```
- **Responses:**
  - `200 OK`: Sets `token` and `refresh_token` cookies. Returns public user object.
  - `400 Bad Request`: Invalid email or password.
  - `429 Too Many Requests`: Rate limit exceeded.

### `POST /api/auth/refresh`
Rotates refresh tokens and issues a new short-lived access token.
- **Access:** Public (Requires `refresh_token` cookie)
- **Responses:**
  - `200 OK`: New session tokens attached in response cookies.
  - `401 Unauthorized`: Token expired or invalid.

### `POST /api/auth/logout`
Revokes the current session and clears cookies.
- **Access:** Authenticated
- **Responses:**
  - `200 OK`: Session cleared.

### `GET /api/auth/me`
Retrieves currently authenticated user profile.
- **Access:** Authenticated

---

## 2. Product & Catalog Endpoints

### `GET /api/products`
Search and filter product catalog with pagination.
- **Access:** Public
- **Query Parameters:**
  - `page` (integer, default: 1)
  - `limit` (integer, default: 20)
  - `search` (string)
  - `category` (string)
  - `minPrice` / `maxPrice` (number)
  - `size` / `color` (string)
  - `availability` (`all` | `in_stock` | `out_of_stock`)
  - `sort` (`newest` | `price_asc` | `price_desc` | `popular` | `rating`)
- **Responses:**
  - `200 OK`: Returns `{ products: [...], pagination: { page, limit, total, totalPages, hasNextPage } }`.

### `GET /api/products/detail/:productId`
Fetches single product details with active variants and reviews.
- **Access:** Public

### `POST /api/products`
Lists a new product with its first variant and photos.
- **Access:** Seller only (`role: "seller"`)
- **Content-Type:** `multipart/form-data`
- **Fields:** `title`, `description`, `category`, `sku`, `priceAmount`, `priceCurrency`, `optionName`, `optionValue`, `stock`, `images` (up to 7 images, <= 5 MB each).

### `PATCH /api/products/:productId`
Updates product title, description, category, SKU, base price or availability.
- **Access:** Seller only (Must own the product)

### `POST /api/products/:productId/variants`
Adds a size/color variant to an existing listing.
- **Access:** Seller only (Must own the product)

---

## 3. Cart & Checkout Endpoints

### `GET /api/cart`
Returns the buyer's persistent shopping bag with server-revalidated prices and stock levels.
- **Access:** Authenticated (`buyer`)

### `POST /api/cart/add/:productId/:variantId`
Adds item to shopping bag. Verifies currency uniformity and available stock.
- **Access:** Authenticated (`buyer`)

### `PATCH /api/cart/quantity/increment/:productId/:variantId`
Increments item quantity in cart.
- **Access:** Authenticated (`buyer`)

### `DELETE /api/cart/remove/:productId/:variantId`
Removes an item from cart.
- **Access:** Authenticated (`buyer`)

### `POST /api/cart/payment/create/order`
Creates a Razorpay order and temporarily locks inventory for 10 minutes.
- **Access:** Authenticated (`buyer`)
- **Request Body:**
  ```json
  {
    "shippingAddress": {
      "fullName": "Alex Mercer",
      "phone": "+91 98765 43210",
      "addressLine1": "108 Marine Drive",
      "city": "Mumbai",
      "state": "Maharashtra",
      "postalCode": "400020",
      "country": "India"
    }
  }
  ```
- **Responses:**
  - `200 OK`: `{ keyId: "rzp_test_...", order: { id: "order_...", amount: 249900, currency: "INR" } }`
  - `409 Conflict`: Insufficient stock or currency conflict.

### `POST /api/cart/payment/verify/order`
Validates cryptographic payment signature, updates payment status to paid, commits reserved inventory, and clears purchased bag items.
- **Access:** Authenticated (`buyer`)
- **Request Body:**
  ```json
  {
    "razorpay_order_id": "order_xyz",
    "razorpay_payment_id": "pay_abc",
    "razorpay_signature": "signature_hex"
  }
  ```

---

## 4. Webhooks & Payments

### `POST /api/payments/razorpay/webhook`
Razorpay webhook endpoint. Verifies raw body HMAC signature against `RAZORPAY_WEBHOOK_SECRET`.
- **Access:** Razorpay webhook service
- **Headers:** `x-razorpay-signature`
- **Supported Events:**
  - `payment.captured`: Confirms payment and commits inventory asynchronously.
  - `payment.failed`: Marks order as failed and releases reserved inventory.
  - `refund.processed`: Logs completed refund.

---

## 5. Orders & Fulfillment

### `GET /api/orders`
Retrieves authenticated customer's order history.
- **Access:** Authenticated (`buyer`)

### `GET /api/orders/seller`
Retrieves seller's order items to prepare, package, and ship.
- **Access:** Seller only

### `PATCH /api/orders/seller/:orderId/fulfillment`
Updates linear fulfillment status of a specific order item.
- **Access:** Seller only (Must own the item)
- **Progression:** `pending` -> `processing` -> `ready` -> `dispatched` -> `delivered`

---

## 6. Analytics Endpoints

### `GET /api/analytics/seller`
Computes real-time seller metrics via MongoDB aggregation (revenue, total orders, best sellers, low-stock warnings).
- **Access:** Seller only

### `GET /api/analytics/admin`
Computes platform-wide marketplace statistics (platform revenue, user counts, top categories, monthly growth).
- **Access:** Admin only (`role: "admin"`)

---

## 7. Health & Infrastructure

### `GET /api/health`
Liveness probe. Returns HTTP 200 with service status and process uptime.

### `GET /api/ready`
Readiness probe. Checks MongoDB connection and Redis cache status. Returns HTTP 200 if ready, 503 if disconnected.

