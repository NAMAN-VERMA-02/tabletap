# Architecture

```
 diner phone --QR token--> /api/v1/public/*  --+
                                               +-- Express app --> MongoDB
 owner / staff --JWT cookie--> /api/v1/*  -----+      |
        ^                                             +-- Socket.io (order:new, order:updated)
        +---------- live kitchen display <---------------+
```

## Request path
`helmet -> cors -> json (100 kB) -> cookies -> pino-http -> route -> validate (zod) -> controller -> error handler`

- **Validation:** every body goes through a zod schema (`server/src/validators`). Unknown keys are stripped, which is how client-sent prices are discarded.
- **Auth:** staff and owners use a JWT in an httpOnly cookie (`server/src/middleware/auth.js`), with roles. Diners have no account; the random QR token is the key to one table.
- **Tenant scoping:** every query for logged-in users filters by `req.user.restaurant`. A foreign id returns 404, not 403, so ids can't be probed.
- **Errors:** controllers throw `ApiError`; `server/src/middleware/error.js` maps Mongoose cast, duplicate-key and validation errors to 400/409 and logs unexpected 500s.
- **Config:** `server/src/config/env.js` validates the environment with zod at startup and refuses to boot in production with the default JWT secret.
- **Logs:** one JSON line per request (pino). Cookie and authorization headers are redacted. `/health` is not logged.

## Data model and indexes
| Collection | Notable indexes |
|---|---|
| `Order` | unique `trackingToken`; unique partial `{table, idempotencyKey}` (only when a key is present); `{restaurant, status, createdAt}` for the kitchen board; `{restaurant, createdAt}` for history |
| `Table` | unique `qrToken`; compound with `restaurant` |
| `MenuItem`, `Category` | compound indexes starting with `restaurant` |

Orders copy each dish's name and price at order time, so editing the menu never changes an old bill.

## Concurrency decisions
- **Duplicate orders.** A diner's phone may retry or double-tap. The client sends an `Idempotency-Key` header, and a partial unique index guarantees one order per `(table, key)`. The handler checks first (the fast path). If two identical requests race past that check, the loser hits the unique index (error 11000) and returns the winner's order with `replayed: true`. Tested with 25 simultaneous identical requests: 1 created, 24 replayed.
- **Status changes.** The handler used to read the order, check the allowed transition, then save, so two simultaneous requests could both pass the check. The update is now one `findOneAndUpdate` conditioned on the status that was checked, and the loser gets 409. Tested with 10 simultaneous identical requests: 1 succeeds, 9 get 409, and the history has no duplicates. Against the old code, the same test let 8 of 10 through.
- **No multi-document transactions.** An order is one document and nothing else is written with it, so a transaction would add a replica-set requirement without protecting anything. If inventory counts are added later, that write plus the order would need one.

## Lifecycle
`server/src/server.js` handles SIGTERM and SIGINT: stop accepting connections, let in-flight requests finish, close Socket.io, disconnect Mongo, exit. A 10-second timer forces exit if something hangs.

## Not done
- Pagination exists only on order history. Menu and table lists are unpaginated (a restaurant has tens of rows, not thousands).
- Rate limiting covers auth and order placement only.
- No schema migrations: indexes are created by Mongoose on startup, which is fine at this size but should become explicit migrations before a large production database.
- Idempotency keys are never expired.
