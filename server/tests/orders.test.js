const request = require('supertest');
const { app, setupDB, ownerAgent, staffAgent } = require('./helpers');

setupDB();

// Owner with one dish and one table; returns a helper that places orders as a diner.
async function kitchen(name = 'Spice Garden') {
  const { agent, user } = await ownerAgent(name);
  const cat = (await agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
  const dish = (await agent.post('/api/v1/menu-items').send({ category: cat._id, name: 'Dosa', price: 120 })).body.item;
  const table = (await agent.post('/api/v1/tables').send({})).body.table;
  const placeOrder = async (qty = 1) => {
    await request(app)
      .post(`/api/v1/public/t/${table.qrToken}/orders`)
      .send({ items: [{ menuItem: dish._id, qty }] });
    const list = await agent.get('/api/v1/orders?limit=1');
    return list.body.orders[0];
  };
  return { agent, user, placeOrder };
}

describe('staff orders', () => {
  it('lists active orders oldest first and excludes finished ones', async () => {
    const { agent, placeOrder } = await kitchen();
    const first = await placeOrder(1);
    const second = await placeOrder(2);
    const third = await placeOrder(3);

    await agent.patch(`/api/v1/orders/${third._id}/status`).send({ status: 'cancelled' });

    const res = await agent.get('/api/v1/orders/active');
    expect(res.body.orders.map((o) => o._id)).toEqual([first._id, second._id]);
  });

  it('moves an order through received → preparing → ready → served and records history', async () => {
    const { agent, placeOrder } = await kitchen();
    const order = await placeOrder();

    for (const status of ['preparing', 'ready', 'served']) {
      const res = await agent.patch(`/api/v1/orders/${order._id}/status`).send({ status });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe(status);
    }
    const final = (await agent.get('/api/v1/orders')).body.orders[0];
    expect(final.statusHistory.map((h) => h.status)).toEqual(['received', 'preparing', 'ready', 'served']);
  });

  it('rejects invalid transitions', async () => {
    const { agent, placeOrder } = await kitchen();
    const order = await placeOrder();
    const move = (status) => agent.patch(`/api/v1/orders/${order._id}/status`).send({ status });

    expect((await move('served')).status).toBe(409); // can't skip steps
    expect((await move('ready')).status).toBe(409);
    expect((await move('received')).status).toBe(409); // already received
    expect((await move('flying')).status).toBe(400); // not a status
    await move('preparing');
    expect((await move('received')).status).toBe(409); // no going back
    await move('cancelled');
    expect((await move('preparing')).status).toBe(409); // cancelled is final
  });

  it('lets staff advance orders but only the owner cancel', async () => {
    const { user, placeOrder } = await kitchen();
    const staff = await staffAgent(user.restaurant);
    const order = await placeOrder();

    expect((await staff.patch(`/api/v1/orders/${order._id}/status`).send({ status: 'preparing' })).status).toBe(200);
    expect((await staff.patch(`/api/v1/orders/${order._id}/status`).send({ status: 'cancelled' })).status).toBe(403);
  });

  it('filters and paginates the order history', async () => {
    const { agent, placeOrder } = await kitchen();
    const a = await placeOrder();
    await placeOrder();
    await placeOrder();
    await agent.patch(`/api/v1/orders/${a._id}/status`).send({ status: 'preparing' });

    const page1 = await agent.get('/api/v1/orders?limit=2&page=1');
    expect(page1.body).toMatchObject({ total: 3, pages: 2, page: 1 });
    expect(page1.body.orders).toHaveLength(2);

    expect((await agent.get('/api/v1/orders?status=preparing')).body.total).toBe(1);
    expect((await agent.get('/api/v1/orders?status=received,preparing')).body.total).toBe(3);

    const today = new Date();
    const ymd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect((await agent.get(`/api/v1/orders?date=${ymd}`)).body.total).toBe(3);
    expect((await agent.get('/api/v1/orders?date=2001-01-01')).body.total).toBe(0);

    expect((await agent.get('/api/v1/orders?status=bogus')).status).toBe(400);
    expect((await agent.get('/api/v1/orders?date=yesterday')).status).toBe(400);
  });

  it("never shows or changes another restaurant's orders", async () => {
    const a = await kitchen('Cafe A');
    const b = await kitchen('Cafe B');
    const order = await a.placeOrder();

    expect((await b.agent.get('/api/v1/orders')).body.total).toBe(0);
    expect((await b.agent.get('/api/v1/orders/active')).body.orders).toHaveLength(0);
    expect((await b.agent.patch(`/api/v1/orders/${order._id}/status`).send({ status: 'preparing' })).status).toBe(404);
  });

  it('requires login', async () => {
    expect((await request(app).get('/api/v1/orders')).status).toBe(401);
  });
});
