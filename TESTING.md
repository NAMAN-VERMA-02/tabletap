# Testing

```bash
cd server && npm test          # Jest + Supertest + in-memory MongoDB, no setup needed
cd server && npm run load      # load test, see BENCHMARKS.md
```

| File | What it proves |
|---|---|
| `auth.test.js` | registration, login, cookies, role checks |
| `menu.test.js` | CRUD, filters, availability, other restaurants' items return 404 |
| `tables.test.js` | auto-numbering, QR regeneration, tenant isolation |
| `public.test.js` | diner menu, server-side pricing, tampered prices ignored, sold-out dishes rejected, bad QR tokens |
| `orders.test.js` | kitchen board, status transitions, owner-only cancel, tenant isolation |
| `idempotency.test.js` | a retried order returns the same order; 25 simultaneous identical requests create 1; a malformed key is rejected; 10 simultaneous identical status changes apply once |
| `analytics.test.js` | dashboard aggregation |
| `realtime.test.js` | Socket.io auth and room isolation |

CI runs the server tests and a client build on every push and pull request, and builds the server Docker image.

## Gaps
- Graceful shutdown (`server/src/server.js`) has not been run or tested yet, and neither has the Docker image locally (CI builds it).
- No browser end-to-end tests for the React client.
- Load testing runs against a local in-memory database, not a deployed one.
