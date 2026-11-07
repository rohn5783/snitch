# SNITCH — Production Deployment & Operations Guide

**Application Target:** Production Docker Container / Vercel / Cloud Run / Kubernetes  
**Runtime:** Node.js 20 LTS Alpine  

---

## 1. Prerequisites & Environment Configuration

Ensure the following environment variables are securely injected into your deployment environment:

| Variable | Requirement | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | Required | Set to `production` |
| `PORT` | Optional | Default: `5173` |
| `MONGO_URI` | **Required** | MongoDB connection string (MongoDB Atlas or Replica Set) |
| `JWT_SECRET` | **Required** | High-entropy secret key for signing access tokens (>= 32 chars) |
| `JWT_REFRESH_SECRET` | Optional | Separate secret key for refresh tokens |
| `REDIS_URL` | Recommended | Redis connection URI (e.g. `redis://default:pwd@host:6379`) |
| `RAZORPAY_KEY_ID` | Required for checkout | Razorpay key ID (`rzp_test_...` or live `rzp_live_...`) |
| `RAZORPAY_KEY_SECRET` | Required for checkout | Razorpay key secret |
| `RAZORPAY_WEBHOOK_SECRET` | Required for webhooks | Secret configured in the Razorpay Webhooks dashboard |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret |
| `GOOGLE_CALLBACK_URL` | Optional | Explicit public callback URL (e.g. `https://snitch.co/auth/google/callback`) |
| `IMAGEKIT_PRIVATE_KEY` | Required for listings | ImageKit API Private Key |

---

## 2. Docker Deployment

### 2.1 Using Docker Compose (Full Stack with Local Mongo & Redis)
```bash
docker compose up -d --build
```
This boots:
1. `snitch-marketplace`: The optimized multi-stage Next.js production server on port 5173.
2. `snitch-redis`: Redis 7 Alpine cache and task queue with persistent volume.
3. `snitch-mongodb`: MongoDB 7.0 database with data persistence.

### 2.2 Standalone Docker Container (Connecting to Managed Atlas & Upstash)
```bash
docker build -t snitch-marketplace:latest .
docker run -d \
  -p 5173:5173 \
  --env-file .env.production \
  --name snitch-app \
  snitch-marketplace:latest
```

---

## 3. Webhook Configuration (Razorpay)

To receive payment confirmations and refund updates in real time:
1. Open the [Razorpay Dashboard](https://dashboard.razorpay.com/) -> **Settings** -> **Webhooks**.
2. Click **Add New Webhook**.
3. Set **Webhook URL** to: `https://your-domain.com/api/payments/razorpay/webhook`.
4. Enter a strong secret and set it as `RAZORPAY_WEBHOOK_SECRET` in your server environment.
5. Enable the following events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
   - `refund.processed`
6. Save. All incoming webhooks will be verified using timing-safe cryptographic HMAC signatures and processed idempotently.

---

## 4. Health & Monitoring Probes

Configure your load balancer or container orchestrator with the following probes:
- **Liveness Probe**: `GET /api/health`
  - Returns HTTP 200 `{ status: "ok" }`.
- **Readiness Probe**: `GET /api/ready`
  - Returns HTTP 200 when MongoDB is connected and ready to accept traffic.
  - Returns HTTP 503 if primary database connectivity is interrupted.

