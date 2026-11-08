# Benchmarks

Order placement (`POST /api/v1/public/t/:qrToken/orders`, 3 dishes per order, a unique `Idempotency-Key` on every request).

## How to reproduce
```bash
cd server && npm ci && npm run load        # defaults: 50 connections, 15 s
node load/orders.mjs 100 30                # connections, seconds
```
The script starts an in-memory MongoDB and the app in one process, seeds the demo restaurant, and drives it with autocannon on two worker threads. It prints JSON.

## Result (one run, 2026-11-09)
Machine: Intel Core i3-1215U (8 threads), 8 GB RAM, Node v24.13.0, Windows 11. MongoDB, the app and the load generator all share it.

| 50 connections, 15 s | |
|---|---|
| Throughput | 58 orders/s (average) |
| Latency p50 / p90 / p99 / max | 807 / 1123 / 1422 / 1730 ms |
| Responses | 875, all 2xx; 0 errors, 0 timeouts |
| Orders stored | 891 (16 more than responses: requests still in flight when the timer stopped) |

## Caveats
- **This is slow and I have not found out why.** At 58 orders/s each request costs about 17 ms of service time. A first run with the load generator on the server's own event loop measured 55/s, so the generator is not the main cause. MongoDB sharing a laptop CPU is the likeliest cause, but that is a guess: nothing has been profiled.
- One run on one machine, so there is no variance across runs yet.
- The per-IP order limiter (15 per 10 minutes) is off in this script (`NODE_ENV=test`); otherwise it would reject almost every request.
- In-memory MongoDB means no network hop and no disk. A hosted database will be slower per request.
