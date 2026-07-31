# API Rate Limiter & Real-Time Analytics Service

A lightweight, modular **Node.js + Express** rate-limiting middleware that implements the **Sliding Window Counter** algorithm to protect APIs from traffic spikes and abuse. The project also includes a real-time analytics engine and an interactive dashboard for monitoring throughput, latency, and rate-limit activity.

---

## Overview

This project demonstrates how modern API rate limiting works using the Sliding Window Counter algorithm. Unlike a traditional fixed-window approach, it minimizes burst traffic around window boundaries while maintaining constant memory usage per client.

The service supports multiple API key tiers, exposes standard rate-limit headers, and provides a live analytics dashboard for monitoring requests in real time.

---

## Features

- Sliding Window Counter rate-limiting algorithm
- O(1) memory usage per client
- Multiple API rate tiers (Free, Pro, Enterprise)
- Client IP fallback for anonymous requests
- RFC-compliant rate limit headers
- Real-time analytics collection
- Interactive dashboard with live charts
- Traffic simulator for testing rate limits
- Modular Express middleware architecture

---

## Tech Stack

- Node.js
- Express.js
- HTML
- CSS
- JavaScript
- Chart.js

---

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm

### Clone the Repository

```bash
git clone https://github.com/k1ll-monger/api-rate-limiter.git
cd api-rate-limiter
```

### Install Dependencies

```bash
npm install
```

### Start the Application

Production mode:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

### Access the Application

Dashboard:

```
http://localhost:3000
```

Protected API:

```
http://localhost:3000/api/v1/resource
```

Metrics API:

```
http://localhost:3000/api/v1/metrics
```

---

## Project Structure

```text
.
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── src/
│   ├── config/
│   │   └── tiers.js
│   │
│   ├── middleware/
│   │   └── rateLimiter.js
│   │
│   ├── routes/
│   │   ├── api.js
│   │   └── metrics.js
│   │
│   └── services/
│       ├── analyticsCollector.js
│       └── slidingWindowStore.js
│
├── server.js
├── package.json
└── README.md
```

---

## Sliding Window Counter Algorithm

### Problem with Fixed Window Rate Limiting

A fixed-window limiter resets its counter at the end of each time window.

For example, if the limit is **10 requests per minute**, a client could send:

- 10 requests at **12:00:59**
- 10 more requests at **12:01:01**

Although each window individually satisfies the limit, the client effectively sends **20 requests within 2 seconds**.

### Sliding Window Counter

Instead of storing every request timestamp, this implementation stores only:

- Current window count
- Previous window count

The effective request count is estimated using:

```text
Estimated Count =
Current Window Count +
Previous Window Count ×
((Window Size − Time Elapsed) / Window Size)
```

If

```text
Estimated Count + 1 > Rate Limit
```

the request is rejected with an HTTP **429 Too Many Requests** response.

This approach provides smoother traffic control while requiring only constant memory per client.

---

## Rate Limit Tiers

| Tier | Authentication | Limit |
|------|----------------|-------|
| Free | `x-api-key: key-free-123` | 10 requests/minute |
| Pro | `x-api-key: key-pro-456` | 50 requests/minute |
| Enterprise | `x-api-key: key-enterprise-789` | 200 requests/minute |
| Anonymous | Client IP | 15 requests/minute |

The rate tiers can be modified in:

```
src/config/tiers.js
```

---

## API Endpoints

### Protected Resource

```
GET /api/v1/resource
```

Returns a sample protected response while enforcing rate limits.

### Metrics

```
GET /api/v1/metrics
```

Returns analytics such as:

- Total requests
- Successful requests
- Rate-limited requests
- Average latency
- Request throughput

---

## Testing

### Anonymous Request

```bash
curl -i http://localhost:3000/api/v1/resource
```

### Free Tier Request

```bash
curl -i \
-H "x-api-key: key-free-123" \
http://localhost:3000/api/v1/resource
```

### Trigger Rate Limiting

```bash
for i in {1..12}
do
  curl -i \
  -H "x-api-key: key-free-123" \
  http://localhost:3000/api/v1/resource
done
```

---

## Example 429 Response

```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 58
Retry-After: 58
Content-Type: application/json
```

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded for Free Tier. Maximum 10 requests per minute allowed.",
  "tier": "Free Tier",
  "retryAfterSeconds": 58
}
```

---


## Future Improvements

- Redis-based distributed rate limiting
- Token Bucket and Leaky Bucket implementations
- Persistent analytics storage
- User authentication
- Docker support
- Unit and integration tests
- Prometheus metrics integration
- Swagger/OpenAPI documentation

---
