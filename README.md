# TableTap 🍽️

**QR ordering and a live kitchen display for restaurants.** Diners scan the QR code on their table, browse the menu and order without signing up. Orders show up instantly on the kitchen screen, and diners watch the status update live.

> 🚧 Work in progress. Auth is done; menu, tables, ordering and the kitchen display are next.
>
> **Live demo:** _coming soon_ · **Demo login:** _coming soon_

## Tech stack
- **Frontend:** React (Vite), React Router, Tailwind CSS, Axios
- **Backend:** Node.js, Express, MongoDB + Mongoose, JWT (httpOnly cookies), Zod validation
- **Security:** bcrypt password hashing, helmet, CORS, rate-limited login
- **Testing:** Jest, Supertest, mongodb-memory-server · **CI:** GitHub Actions

## Features
- [x] Owner sign-up creates a restaurant; JWT auth in httpOnly cookies; owner/staff roles
- [x] Menu categories and items CRUD (search, filters, veg/non-veg, sold-out toggle for staff)
- [ ] Image upload to Cloudinary (image URLs work for now)
- [x] Tables CRUD with QR codes (download, regenerate) and a printable QR sheet
- [ ] Public QR menu, cart and order placement (prices recalculated on the server)
- [ ] Real-time kitchen display (Socket.io)
- [ ] Live order status for diners
- [ ] Analytics dashboard (MongoDB aggregation)
- [ ] Staff management

## Project structure
```
tabletap/
├── client/                 # React app (Vite)
│   └── src/
│       ├── components/     # ProtectedRoute, layouts
│       ├── context/        # AuthContext
│       ├── lib/api.js      # Axios instance
│       └── pages/          # Landing, Login, Register, Dashboard
└── server/                 # Express API
    ├── src/
    │   ├── config/         # env + MongoDB connection
    │   ├── controllers/
    │   ├── middleware/     # auth (protect/authorize), validate, error
    │   ├── models/         # User, Restaurant
    │   ├── routes/
    │   ├── validators/     # Zod schemas
    │   ├── app.js
    │   └── server.js
    └── tests/
```

## Run locally
You need Node 20+ and MongoDB, either installed locally or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster.

```bash
# 1. API
cd server
cp .env.example .env     # then set MONGO_URI and JWT_SECRET
npm install
npm run dev              # http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev              # http://localhost:5173
```

No MongoDB yet? Run `npm run dev:memory` in `server/` instead of `npm run dev`. It uses a throwaway in-memory database, and the data is wiped when you stop it.

Run the API tests (they use an in-memory MongoDB, so no setup is needed):
```bash
cd server && npm test
```

## API
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/v1/health` | Public | Health check |
| POST | `/api/v1/auth/register` | Public | Create owner account + restaurant |
| POST | `/api/v1/auth/login` | Public | Log in (sets cookie) |
| POST | `/api/v1/auth/logout` | Public | Clear cookie |
| GET | `/api/v1/auth/me` | Logged in | Current user + restaurant |
| GET | `/api/v1/categories` | Owner, staff | List categories with item counts |
| POST / PATCH / DELETE | `/api/v1/categories[/:id]` | Owner | Create / rename / delete (blocked if it still has items) |
| GET | `/api/v1/menu-items?category=&search=&available=` | Owner, staff | List / filter items |
| GET | `/api/v1/menu-items/:id` | Owner, staff | Get one item |
| POST / PATCH / DELETE | `/api/v1/menu-items[/:id]` | Owner | Create / edit / delete items |
| PATCH | `/api/v1/menu-items/:id/availability` | Owner, staff | Mark an item sold out / available |
| GET | `/api/v1/tables` | Owner, staff | List tables |
| POST / PATCH / DELETE | `/api/v1/tables[/:id]` | Owner | Create (auto-numbered) / edit / delete tables |
| GET | `/api/v1/tables/:id/qr` | Owner | QR code (PNG data URL) for one table |
| POST | `/api/v1/tables/:id/regenerate-qr` | Owner | New random QR token; the old printed code stops working |
| GET | `/api/v1/tables/qr-sheet` | Owner | QR codes for all active tables (print view) |

Every query is scoped to the logged-in user's restaurant, so one restaurant can never read or change another's data (covered by tests).

## Deployment
- **API → Render:** root directory `server`, build `npm install`, start `npm start`. Set `NODE_ENV=production`, `MONGO_URI`, `JWT_SECRET` and `CLIENT_URL` (your Vercel URL).
- **Frontend → Vercel:** root directory `client`. Set `VITE_API_URL` to your Render URL.
