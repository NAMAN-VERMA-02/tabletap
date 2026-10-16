const http = require('http');
const request = require('supertest');
const { io: connect } = require('socket.io-client');
const { app, setupDB, ownerAgent } = require('./helpers');
const { initSocket, closeSocket } = require('../src/socket');

setupDB();

let server;
let url;
const sockets = [];

beforeAll(async () => {
  server = http.createServer(app);
  initSocket(server);
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}`;
});

afterEach(() => {
  sockets.splice(0).forEach((s) => s.disconnect());
});

afterAll(async () => {
  closeSocket();
  await new Promise((resolve) => server.close(resolve));
});

function socket(cookie) {
  const s = connect(url, { transports: ['websocket'], extraHeaders: cookie ? { Cookie: cookie } : {} });
  sockets.push(s);
  return new Promise((resolve, reject) => {
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}

const nextEvent = (s, event, ms = 3000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${event} within ${ms}ms`)), ms);
    s.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const noEvent = (s, event, ms = 400) =>
  new Promise((resolve, reject) => {
    const handler = () => reject(new Error(`unexpected ${event}`));
    s.once(event, handler);
    setTimeout(() => {
      s.off(event, handler);
      resolve();
    }, ms);
  });

// Registers an owner (keeping the auth cookie for the socket) with one dish and table.
async function setup(name = 'Spice Garden') {
  const agent = request.agent(app);
  const reg = await agent.post('/api/v1/auth/register').send({
    name: 'Owner',
    email: `${name.replace(/\s/g, '').toLowerCase()}@example.edu`,
    password: 'supersecret1',
    restaurantName: name,
  });
  const cookie = reg.headers['set-cookie'][0].split(';')[0];
  const cat = (await agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
  const dish = (await agent.post('/api/v1/menu-items').send({ category: cat._id, name: 'Dosa', price: 120 })).body.item;
  const table = (await agent.post('/api/v1/tables').send({})).body.table;
  const order = () =>
    request(app)
      .post(`/api/v1/public/t/${table.qrToken}/orders`)
      .send({ items: [{ menuItem: dish._id, qty: 1 }] });
  return { agent, cookie, order };
}

describe('real-time updates', () => {
  it('pushes new orders to that restaurant’s kitchen only', async () => {
    const a = await setup('Cafe A');
    const b = await setup('Cafe B');
    const kitchenA = await socket(a.cookie);
    const kitchenB = await socket(b.cookie);
    const anonymous = await socket();

    const gotA = nextEvent(kitchenA, 'order:new');
    const quietB = noEvent(kitchenB, 'order:new');
    const quietAnon = noEvent(anonymous, 'order:new');
    await a.order();

    const pushed = await gotA;
    expect(pushed.items[0].name).toBe('Dosa');
    expect(pushed.status).toBe('received');
    await quietB;
    await quietAnon;
  });

  it('pushes status changes to the diner watching that order', async () => {
    const { agent, order } = await setup();
    const placed = (await order()).body.order;
    const other = (await order()).body.order;

    const diner = await socket();
    const ack = await diner.emitWithAck('order:subscribe', placed.trackingToken);
    expect(ack).toEqual({ ok: true });

    const [mine] = (await agent.get('/api/v1/orders/active')).body.orders;
    const [otherOrder] = (await agent.get('/api/v1/orders/active')).body.orders.slice(1);

    const update = nextEvent(diner, 'order:updated');
    await agent.patch(`/api/v1/orders/${mine._id}/status`).send({ status: 'preparing' });
    const payload = await update;
    expect(payload.status).toBe('preparing');
    expect(payload.trackingToken).toBe(placed.trackingToken);
    expect(payload.restaurant).toBeUndefined(); // diners get the public view only

    // Changes to someone else's order don't reach this diner.
    const quiet = noEvent(diner, 'order:updated');
    await agent.patch(`/api/v1/orders/${otherOrder._id}/status`).send({ status: 'preparing' });
    await quiet;
    expect(other.trackingToken).not.toBe(placed.trackingToken);
  });

  it('refuses to subscribe to unknown or malformed tracking tokens', async () => {
    const diner = await socket();
    expect(await diner.emitWithAck('order:subscribe', 'a'.repeat(24))).toEqual({ ok: false });
    expect(await diner.emitWithAck('order:subscribe', { $ne: null })).toEqual({ ok: false });
  });
});
