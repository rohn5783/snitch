import http from "k6/http";
import { check, sleep, group } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 10 }, // Ramp-up to 10 VUs
    { duration: "1m", target: 50 },  // Ramp-up to 50 VUs
    { duration: "1m", target: 100 }, // Peak load at 100 VUs
    { duration: "30s", target: 0 },  // Ramp-down
  ],
  thresholds: {
    http_req_duration: ["p(95)<350", "p(99)<700"], // 95% of requests must complete under 350ms
    http_req_failed: ["rate<0.01"],               // Failure rate must be under 1%
  },
};

const BASE_URL = __ENV.API_URL || "http://localhost:5173";

export default function () {
  group("01_Catalog_Browsing", function () {
    const listRes = http.get(`${BASE_URL}/api/products?page=1&limit=20`);
    check(listRes, {
      "product list status is 200": (r) => r.status === 200,
      "product list returns data": (r) => r.json("success") === true,
    });

    sleep(1);

    const searchRes = http.get(`${BASE_URL}/api/products?search=shirt&sort=newest`);
    check(searchRes, {
      "search status is 200": (r) => r.status === 200,
    });

    sleep(1);
  });

  group("02_System_Health", function () {
    const healthRes = http.get(`${BASE_URL}/api/health`);
    check(healthRes, {
      "health status is 200": (r) => r.status === 200,
    });

    const readyRes = http.get(`${BASE_URL}/api/ready`);
    check(readyRes, {
      "ready status is 200 or 503": (r) => r.status === 200 || r.status === 503,
    });

    sleep(1);
  });

  group("03_Authentication_Velocity", function () {
    const payload = JSON.stringify({
      email: `benchmark_user_${__VU}@snitch.co`,
      password: "TestPassword123!",
    });

    const params = {
      headers: { "Content-Type": "application/json" },
    };

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, payload, params);
    check(loginRes, {
      "login rate limit or auth check responded": (r) => r.status === 200 || r.status === 400 || r.status === 429,
    });

    sleep(1);
  });
}

