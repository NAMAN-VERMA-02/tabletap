const request = require('supertest');
const { app, setupDB, ownerAgent } = require('./helpers');
const Order = require('../src/models/Order');

setupDB();

// Owner with 2 categories, 3 dishes (one sold out) and one table.
async function restaurantWithMenu(name = 'Spice Garden') {
  const { agent } = await ownerAgent(name);
  const mains = (await agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
  const empty = (await agent.post('/api/v1/categories').send({ name: 'Desserts' })).body.category;
  const add = async (body) => (await agent.post('/api/v1/menu-items').send({ category: mains._id, ...body })).body.item;
  const paneer = await add({ name: 'Paneer Tikka', price: 249.5 });
  const naan = await add({ name: 'Butter Naan', price: 45 });
  const soldOut = await add({ name: 'Biryani', price: 300, isAvailable: false });
  const table = (await agent.post('/api/v1/tables').send({ label: 'Window' })).body.table;
  return { agent, mains, empty, paneer, naan, soldOut, table };
}

describe('public QR menu', () => {
  it('shows the restaurant, table and only available dishes in non-empty categories', async () => {
    const { table } = await restaurantWithMenu();
    const res = await request(app).get(`/api/v1/public/t/${table.qrToken}`);

    expect(res.status).toBe(200);
    expect(res.body.restaurant).toEqual({ name: 'Spice Garden', currency: 'INR', taxPercent: 5 });
    expect(res.body.table).toEqual({ number: 1, label: 'Window' });
    expect(res.body.categories.map((c) => c.name)).toEqual(['Mains']);
    expect(res.body.items.map((i) => i.name)).toEqual(['Paneer Tikka', 'Butter Naan']);
    expect(res.body.items[0].restaurant).toBeUndefined();
  });

  it('404s for unknown, malformed, regenerated or disabled QR codes', async () => {
    const { agent, table } = await restaurantWithMenu();
    expect((await request(app).get(`/api/v1/public/t/${'0'.repeat(32)}`)).status).toBe(404);
    expect((await request(app).get('/api/v1/public/t/not-a-token')).status).toBe(404);

    await agent.post(`/api/v1/tables/${table._id}/regenerate-qr`);
    expect((await request(app).get(`/api/v1/public/t/${table.qrToken}`)).status).toBe(404);

    const t2 = (await agent.post('/api/v1/tables').send({})).body.table;
    await agent.patch(`/api/v1/tables/${t2._id}`).send({ isActive: false });
    expect((await request(app).get(`/api/v1/public/t/${t2.qrToken}`)).status).toBe(404);
  });
});

describe('placing an order', () => {
  it('prices the order from the database and ignores prices sent by the client', async () => {
    const { table, paneer, naan } = await restaurantWithMenu();

    const res = await request(app)
      .post(`/api/v1/public/t/${table.qrToken}/orders`)
      .send({
        customerName: 'Ravi',
        items: [
          { menuItem: paneer._id, qty: 2, price: 1, note: 'less spicy' }, // tampered price
          { menuItem: naan._id, qty: 3, price: 0 },
        ],
        total: 1,
      });

    expect(res.status).toBe(201);
    const { order } = res.body;
    // 2 x 249.5 + 3 x 45 = 634; 5% tax = 31.7
    expect(order.subtotal).toBe(634);
    expect(order.tax).toBe(31.7);
    expect(order.total).toBe(665.7);
    expect(order.items[0]).toMatchObject({ name: 'Paneer Tikka', price: 249.5, qty: 2, note: 'less spicy' });
    expect(order.status).toBe('received');
    expect(order.tableNumber).toBe(1);
    expect(order.trackingToken).toMatch(/^[a-f0-9]{24}$/);
  });

  it('keeps the price snapshot even if the menu price changes later', async () => {
    const { agent, table, naan } = await restaurantWithMenu();
    const placed = await request(app)
      .post(`/api/v1/public/t/${table.qrToken}/orders`)
      .send({ items: [{ menuItem: naan._id, qty: 1 }] });

    await agent.patch(`/api/v1/menu-items/${naan._id}`).send({ price: 99, name: 'Garlic Naan' });

    const tracked = await request(app).get(`/api/v1/public/orders/${placed.body.order.trackingToken}`);
    expect(tracked.body.order.items[0]).toMatchObject({ name: 'Butter Naan', price: 45 });
  });

  it('rejects sold-out dishes with a 409 naming them', async () => {
    const { table, paneer, soldOut } = await restaurantWithMenu();
    const res = await request(app)
      .post(`/api/v1/public/t/${table.qrToken}/orders`)
      .send({ items: [{ menuItem: paneer._id, qty: 1 }, { menuItem: soldOut._id, qty: 1 }] });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Biryani');
    expect(await Order.countDocuments()).toBe(0);
  });

  it("rejects dishes from another restaurant's menu", async () => {
    const a = await restaurantWithMenu('Cafe A');
    const b = await restaurantWithMenu('Cafe B');
    const res = await request(app)
      .post(`/api/v1/public/t/${a.table.qrToken}/orders`)
      .send({ items: [{ menuItem: b.paneer._id, qty: 1 }] });
    expect(res.status).toBe(400);
  });

  it('validates the cart', async () => {
    const { table, paneer } = await restaurantWithMenu();
    const url = `/api/v1/public/t/${table.qrToken}/orders`;
    expect((await request(app).post(url).send({ items: [] })).status).toBe(400);
    expect((await request(app).post(url).send({ items: [{ menuItem: paneer._id, qty: 0 }] })).status).toBe(400);
    expect((await request(app).post(url).send({ items: [{ menuItem: paneer._id, qty: 21 }] })).status).toBe(400);
    expect((await request(app).post(url).send({ items: [{ menuItem: 'bad', qty: 1 }] })).status).toBe(400);
  });

  it('refuses orders on a disabled table', async () => {
    const { agent, table, paneer } = await restaurantWithMenu();
    await agent.patch(`/api/v1/tables/${table._id}`).send({ isActive: false });
    const res = await request(app)
      .post(`/api/v1/public/t/${table.qrToken}/orders`)
      .send({ items: [{ menuItem: paneer._id, qty: 1 }] });
    expect(res.status).toBe(404);
  });
});

describe('order tracking', () => {
  it('returns the order with its status history, and 404s for unknown tokens', async () => {
    const { table, paneer } = await restaurantWithMenu();
    const placed = await request(app)
      .post(`/api/v1/public/t/${table.qrToken}/orders`)
      .send({ items: [{ menuItem: paneer._id, qty: 1 }] });

    const res = await request(app).get(`/api/v1/public/orders/${placed.body.order.trackingToken}`);
    expect(res.status).toBe(200);
    expect(res.body.restaurant.name).toBe('Spice Garden');
    expect(res.body.order.statusHistory.map((h) => h.status)).toEqual(['received']);
    expect(res.body.order._id).toBeUndefined();

    expect((await request(app).get(`/api/v1/public/orders/${'a'.repeat(24)}`)).status).toBe(404);
  });
});
