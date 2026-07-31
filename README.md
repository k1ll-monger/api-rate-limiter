# API Rate Limiting Middleware & Real-Time Analytics Dashboard

Designed & Developed by **Kaustubh** ([@k1ll-monger](https://github.com/k1ll-monger))

A production-grade, high-performance Node.js & Express API Rate Limiter service utilizing an atomic **Sliding Window Counter** algorithm. Includes a real-time analytics engine and an interactive single-page dashboard for traffic monitoring, rate limit testing, and HTTP metadata inspection.

---

## 🏛️ System Architecture

The service consists of four core decoupled modules designed with clean separation of concerns:

```
                  +----------------------------------------------+
                  |         HTTP Client / Browser Dashboard      |
                  +----------------------------------------------+
                                         |
                       x-api-key / Client IP Header
                                         v
                  +----------------------------------------------+
                  |    Express Server & Rate Limiter Middleware  |
                  +----------------------------------------------+
                                 /                \
          Tier Lookup & Window Check            Record Stats & Latency
                               /                    \
  +------------------------------------+    +------------------------------------+
  |      SlidingWindowStore            |    |        AnalyticsCollector          |
  |  - Sliding Window Math Calculation |    |  - Real-Time Requests & Latencies  |
  |  - Garbage Collector for Old Logs  |    |  - 60s Rolling Second Time-Series  |
  |  - Abstract Storage Interface      |    |  - Top 50 Activity Log Inspector   |
  +------------------------------------+    +------------------------------------+
                                                      |
                                            GET /api/v1/metrics
                                                      v
                                            +-------------------+
                                            | Chart.js Streaming|
                                            |     Dashboard     |
                                            +-------------------+
```

### Component Breakdown

| Component | File Path | Responsibilities |
|---|---|---|
| **Tier Rules** | [`src/config/tiers.js`](file:///c:/Users/kaust/Downloads/kaunew/src/config/tiers.js) | Defines rate limits for `Free`, `Pro`, `Enterprise`, and `Anonymous` IP fallbacks. |
| **Sliding Window Store** | [`src/services/slidingWindowStore.js`](file:///c:/Users/kaust/Downloads/kaunew/src/services/slidingWindowStore.js) | Memory-efficient sliding window math, atomic counter updates, garbage collection. |
| **Analytics Engine** | [`src/services/analyticsCollector.js`](file:///c:/Users/kaust/Downloads/kaunew/src/services/analyticsCollector.js) | Tracks requests/sec, pass/block ratios, latencies, and time-series streaming data. |
| **Express Middleware** | [`src/middleware/rateLimiter.js`](file:///c:/Users/kaust/Downloads/kaunew/src/middleware/rateLimiter.js) | Enforces limits, injects RFC `X-RateLimit-*` and `Retry-After` headers, handles 429 status. |
| **Protected API Endpoints** | [`src/routes/api.js`](file:///c:/Users/kaust/Downloads/kaunew/src/routes/api.js) | Sample API routes (`/resource`, `/submit`, `/analytics`). |
| **Metrics API** | [`src/routes/metrics.js`](file:///c:/Users/kaust/Downloads/kaunew/src/routes/metrics.js) | Exposes `/api/v1/metrics` and reset endpoints for the frontend dashboard. |
| **Interactive Dashboard** | [`public/index.html`](file:///c:/Users/kaust/Downloads/kaunew/public/index.html) | Modern dark glassmorphism SPA with live KPI cards, Chart.js traffic streaming, and simulator panel. |

---

## 🧮 Mathematical Breakdown: Sliding Window Counter Algorithm

The **Sliding Window Counter** algorithm combines the memory efficiency of the *Fixed Window* algorithm with the boundary precision of *Sliding Window Logs*.

### The Boundary Problem in Fixed Window
In a standard Fixed Window algorithm (e.g. 10 requests per minute from 12:00 to 12:01):
- A client can send 10 requests at 12:00:59, and another 10 requests at 12:01:01.
- Even though both windows individually respect the 10 req/min limit, the client successfully executed **20 requests in a 2-second interval across the window boundary** (2x the allowed throughput).

### Sliding Window Counter Solution
Instead of storing timestamp logs for every request (which consumes $O(N)$ memory), we maintain request counts for discrete fixed windows of length $W$ (e.g., $W = 60000\text{ ms}$).

For any request arriving at timestamp $T$:
1. Identify Current Window ID:
   $$W_{\text{curr}} = \lfloor \frac{T}{W} \rfloor$$
2. Identify Previous Window ID:
   $$W_{\text{prev}} = W_{\text{curr}} - 1$$
3. Calculate Time Elapsed in Current Window:
   $$t_{\text{elapsed}} = T \pmod W$$
4. Calculate Weight of Previous Window:
   $$\text{Weight}_{\text{prev}} = \frac{W - t_{\text{elapsed}}}{W}$$
5. Calculate Estimated Request Count in the Sliding Window:
   $$\text{Count}_{\text{sliding}} = \text{Count}(W_{\text{curr}}) + \left( \text{Count}(W_{\text{prev}}) \times \text{Weight}_{\text{prev}} \right)$$

### Decision Logic
- If $\lfloor \text{Count}_{\text{sliding}} \rfloor + 1 > \text{Limit}$:
  - Reject request with **HTTP 429 Too Many Requests**.
  - Calculate `Retry-After`:
    $$\text{RetryAfter} = \max\left(1, \left\lceil \frac{W - t_{\text{elapsed}}}{1000} \right\rceil\right) \text{ seconds}$$
- Otherwise:
  - Increment $\text{Count}(W_{\text{curr}})$ by 1.
  - Allow request and set standard headers:
    - `X-RateLimit-Limit`: Maximum requests allowed per window.
    - `X-RateLimit-Remaining`: $\max(0, \text{Limit} - \lfloor \text{Count}_{\text{sliding}} \rfloor)$.
    - `X-RateLimit-Reset`: $\lceil \frac{(W_{\text{curr}} + 1) \times W}{1000} \rceil$ (epoch seconds).

---

## 🚦 Tier Configurations

Rate limits are configured in [`src/config/tiers.js`](file:///c:/Users/kaust/Downloads/kaunew/src/config/tiers.js):

| Tier Name | Header Key | Rate Limit | Identification Strategy |
|---|---|---|---|
| **Free Tier** | `x-api-key: key-free-123` | 10 req / min | Key-based (`key:key-free-123`) |
| **Pro Tier** | `x-api-key: key-pro-456` | 50 req / min | Key-based (`key:key-pro-456`) |
| **Enterprise Tier** | `x-api-key: key-enterprise-789` | 200 req / min | Key-based (`key:key-enterprise-789`) |
| **Anonymous (Fallback)** | None | 15 req / min | IP-based (`ip:127.0.0.1`) |

---

## 🚀 Quick Start & Local Execution

### Prerequisites
- Node.js (v16+ recommended)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```

The Express server will initialize on port 3000:
- **Dashboard UI**: `http://localhost:3000/`
- **Metrics JSON API**: `http://localhost:3000/api/v1/metrics`
- **Protected Endpoint**: `http://localhost:3000/api/v1/resource`

---

## 🧪 Testing with `curl`

### Test 1: Anonymous IP Request
```bash
curl -i http://localhost:3000/api/v1/resource
```
*Expected output:* `X-RateLimit-Limit: 15`, `X-RateLimit-Remaining: 14`, Status `200 OK`.

### Test 2: Free Tier Key Request
```bash
curl -i -H "x-api-key: key-free-123" http://localhost:3000/api/v1/resource
```
*Expected output:* `X-RateLimit-Limit: 10`, `X-RateLimit-Remaining: 9`, Status `200 OK`.

### Test 3: Trigger Limit Breach (HTTP 429)
Execute 11 consecutive requests within 60 seconds using the Free Tier key:
```bash
for i in {1..11}; do curl -i -H "x-api-key: key-free-123" http://localhost:3000/api/v1/resource; done
```
*Expected output on 11th request:*
- **Status**: `429 Too Many Requests`
- **Header**: `Retry-After: 58`
- **Body**:
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded for Free Tier. Maximum 10 requests per minute allowed.",
  "tier": "Free Tier",
  "limit": 10,
  "remaining": 0,
  "retryAfterSeconds": 58,
  "resetTime": 1785500000
}
```

---

## 💼 Resume Bullet Points for SDE Candidates

Below are production-grade resume points highlighting backend system design and API engineering achievements:

- **Architected and implemented a high-performance API Rate Limiter middleware** in Node.js/Express using a custom **Sliding Window Counter algorithm**, mitigating border burst vulnerability while reducing memory overhead by **$O(N) \rightarrow O(1)$** per client compared to sliding window logs.
- **Engineered multi-tenant tier-based access control** enforcing key-level throttling (`Free`: 10 req/min, `Pro`: 50 req/min) with automated client IP fallbacks, returning RFC-compliant headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`).
- **Designed a real-time observability engine & analytics dashboard** powered by Express and Chart.js, recording microsecond request latencies, pass/block ratios, and continuous 60-second time-series traffic metrics.
- **Built an in-memory thread-safe state store** with automatic garbage collection for stale window counters, structured with a swappable storage adapter interface to enable seamless migration to distributed Redis clusters.
