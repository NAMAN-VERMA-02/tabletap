const { Server } = require('socket.io');
const env = require('./config/env');
const Order = require('./models/Order');
const { userFromToken } = require('./middleware/auth');
const { publicOrder } = require('./utils/orderView');

let io = null;

const restaurantRoom = (id) => `restaurant:${id}`;
const orderRoom = (trackingToken) => `order:${trackingToken}`;

function readCookie(header = '', name) {
  const match = header.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

// Rooms:
//   restaurant:<id>  logged-in staff/owner of that restaurant (kitchen display)
//   order:<token>    a diner watching their own order
function initSocket(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.clientUrl, credentials: true } });

  // Login is optional: diners connect anonymously. Staff are identified by a short-lived
  // socket token (production, cross-origin) or their session cookie (same origin, e.g. dev).
  io.use(async (socket, next) => {
    const socketToken = socket.handshake.auth?.token;
    const cookieToken = readCookie(socket.handshake.headers.cookie, 'token');
    try {
      if (socketToken) socket.data.user = await userFromToken(socketToken, 'socket');
      else if (cookieToken) socket.data.user = await userFromToken(cookieToken);
    } catch {
      /* treat as anonymous */
    }
    next();
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    if (user) socket.join(restaurantRoom(user.restaurant));

    socket.on('order:subscribe', async (trackingToken, ack) => {
      const valid = typeof trackingToken === 'string' && /^[a-f0-9]{24}$/.test(trackingToken);
      const exists = valid && (await Order.exists({ trackingToken }));
      if (exists) socket.join(orderRoom(trackingToken));
      if (typeof ack === 'function') ack({ ok: Boolean(exists) });
    });
  });

  return io;
}

// No-ops when Socket.io isn't running (e.g. in HTTP-only tests).
function emitOrderNew(order) {
  io?.to(restaurantRoom(order.restaurant)).emit('order:new', order);
}

function emitOrderUpdated(order) {
  io?.to(restaurantRoom(order.restaurant)).emit('order:updated', order);
  io?.to(orderRoom(order.trackingToken)).emit('order:updated', publicOrder(order));
}

function closeSocket() {
  io?.close();
  io = null;
}

module.exports = { initSocket, emitOrderNew, emitOrderUpdated, closeSocket };
