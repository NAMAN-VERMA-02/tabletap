# TableTap 🍽️

**QR ordering and a live kitchen display for restaurants.** Diners scan the QR code on their table, browse the menu and order without signing up. Orders show up instantly on the kitchen screen, staff move them along with one tap, and diners watch the status update live on their phone.

> **Live demo:** _coming soon_ · **Demo login:** `demo@tabletap.test` / `demo12345`

## Tech stack
- **Frontend:** React (Vite), React Router, Tailwind CSS, Recharts, Socket.io client
- **Backend:** Node.js, Express, MongoDB + Mongoose, Socket.io, JWT (httpOnly cookies), Zod validation
- **Security:** bcrypt, helmet, CORS, rate limiting, per-restaurant data scoping
- **Testing:** Jest, Supertest, mongodb-memory-server (49 API and real-time tests) · **CI:** GitHub Actions

## Features
- **Auth and roles:** owner sign-up creates a restaurant; owner and staff roles; JWT in httpOnly cookies
- **Menu:** categories and dishes with search and filters, veg/non-veg, and a sold-out toggle staff can use
- **Tables and QR codes:** auto-numbered tables, per-table QR codes (download or regenerate), and a printable A4 QR sheet
- **Diner ordering:** a mobile QR menu with search, veg filter and a saved cart. The server prices every order itself.
- **Live kitchen display:** New → Preparing → Ready columns, order timers, late-order highlight, new-order chime
- **Live order status:** diners see each step instantly over Socket.io
- **Analytics:** revenue, orders, average order value, busiest hour, revenue per day, top dishes, and orders by hour. One MongoDB `$facet` aggregation computes them all.
- **Order history:** filter by status and date, with pagination and expandable rows

Still to do: Cloudinary image upload (image URLs work for now) and staff management.

## Run locally
You need Node 20+. MongoDB is optional for trying it out.

```bash
# API with a throwaway in-memory database + demo data (no MongoDB needed)
cd server
npm install
npm run dev:demo          # http://localhost:5000

# Frontend (new terminal)
cd client
npm install
npm run dev               # http://localhost:5173  → log in with the demo account above
```

To use a real database, copy `server/.env.example` to `server/.env` and set `MONGO_URI` (local MongoDB or a free [Atlas](https://www.mongodb.com/atlas) cluster) and `JWT_SECRET`. Then run `npm run seed` once to load the demo restaurant, and `npm run dev`.

Tests (in-memory MongoDB, no setup):
```bash
cd server && npm test
```

## Project structure
```
tabletap/
├── client/src/
│   ├── pages/          # Dashboard (analytics), Menu, Tables, QrSheet, Orders, Kitchen,
│   │                   # TableMenu + OrderStatus (diner pages), Login, Register, Landing
│   ├── components/     # layout, modal, menu/, tables/, order/, kitchen/, analytics/
│   ├── hooks/useCart.js
│   ├── context/AuthContext.jsx
│   └── lib/            # api (axios), socket, format, storage, chime
└── server/
    ├── src/
    │   ├── models/     # User, Restaurant, Category, MenuItem, Table, Order
    │   ├── controllers/ routes/ validators/ middleware/
    │   ├── socket.js   # Socket.io rooms + emit helpers
    │   ├── app.js, server.js
    ├── scripts/        # dev-memory (in-memory DB), demoData, seed
    └── tests/
```

## API
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Public | Create owner account + restaurant |
| POST | `/api/v1/auth/login` · `/logout` | Public | Log in (sets cookie) / log out |
| GET | `/api/v1/auth/me` | Logged in | Current user + restaurant |
| GET | `/api/v1/categories` | Owner, staff | Categories with item counts |
| POST / PATCH / DELETE | `/api/v1/categories[/:id]` | Owner | Create / rename / delete (blocked while it has items) |
| GET | `/api/v1/menu-items?category=&search=&available=` | Owner, staff | List and filter dishes |
| POST / PATCH / DELETE | `/api/v1/menu-items[/:id]` | Owner | Create / edit / delete dishes |
| PATCH | `/api/v1/menu-items/:id/availability` | Owner, staff | Mark sold out / available |
| GET | `/api/v1/tables` | Owner, staff | List tables |
| POST / PATCH / DELETE | `/api/v1/tables[/:id]` | Owner | Create (auto-numbered) / edit / delete |
| GET | `/api/v1/tables/:id/qr` · `/tables/qr-sheet` | Owner | QR code for one table / all active tables |
| POST | `/api/v1/tables/:id/regenerate-qr` | Owner | New QR token; the old printed code stops working |
| GET | `/api/v1/public/t/:qrToken` | Public (QR) | Restaurant, table and available menu |
| POST | `/api/v1/public/t/:qrToken/orders` | Public (QR) | Place an order (rate-limited) |
| GET | `/api/v1/public/orders/:trackingToken` | Public | Order status for the diner |
| GET | `/api/v1/orders?status=&date=&page=&limit=` | Owner, staff | Order history with filters and pagination |
| GET | `/api/v1/orders/active` | Owner, staff | Open orders for the kitchen, oldest first |
| PATCH | `/api/v1/orders/:id/status` | Owner, staff (cancel: owner) | received → preparing → ready → served |
| GET | `/api/v1/analytics/summary?range=today\|7d\|30d` | Owner | Dashboard numbers (one `$facet` aggregation) |

**Real-time events (Socket.io):** staff sockets are authenticated with the same auth cookie and join `restaurant:<id>`, which gets `order:new` and `order:updated`. Diners join `order:<trackingToken>` and get only their own order's updates, as the public view.

## Design decisions worth knowing
- **The server never trusts client prices.** Orders are priced from the database, and each dish's name and price are copied into the order, so later menu edits never change old bills.
- **Every query is scoped to the user's restaurant.** One restaurant can never read or change another's data, and tests cover this for every resource.
- **Unguessable public links.** QR codes and tracking links use random tokens instead of database ids, and owners can regenerate a table's QR if a photo of it leaks.
- **Analytics in the restaurant's timezone.** Days and hours are bucketed in local time, and empty days and hours are filled in so the charts have no gaps.
- **Code-split frontend.** Diners scanning a QR don't download the dashboard or chart code.

- **Login works in every browser.** In production the frontend proxies `/api` to the server, so the auth cookie is first-party, and Safari doesn't block it. The live websocket connects straight to the API using a 5-minute socket token, since the frontend host can't proxy websockets.

## Deployment
MongoDB Atlas (database) + Render (API) + Vercel (frontend), all on free tiers.

1. **Atlas:** create a free M0 cluster, a database user, and allow network access from `0.0.0.0/0` (Render's IPs change). Copy the connection string.
2. **Render:** New → Blueprint → this repo. `render.yaml` sets everything up; fill in `MONGO_URI` and `CLIENT_URL` (your Vercel URL).
3. **Vercel:** import the repo with root directory `client`, and set `VITE_SOCKET_URL` to your Render URL. The Render URL is set in `client/vercel.json`; change it there if you deploy your own copy.
4. **Demo data:** run `npm run seed` in `server/` once, with `MONGO_URI` pointing at Atlas.

The free Render plan sleeps after 15 minutes idle, so the first request after a break takes about 30–50 seconds.
