const request = require('supertest');
const { app, setupDB, ownerAgent } = require('./helpers');
const Order = require('../src/models/Order');

setupDB();

async function tableWithDish() {
  const { agent } = await ownerAgent();
  const cat = (await agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
  const dish = (await agent.post('/api/v1/menu-items').send({ category: cat._id, name: 'Naan', price: 45 })).body.item;
  const table = (await agent.post('/api/v1/tables').send({})).body.table;
  // dropDatabase() between tests also drops indexes, so rebuild the unique one.
  await Order.syncIndexes();
  return { table, dish };
}

const place = (table, dish, key) => {
  const req = request(app).post(`/api/v1/public/t/${table.qrToken}/orders`);
  if (key) req.set('Idempotency-Key', key);
  return req.send({ items: [{ menuItem: dish._id, qty: 1 }] });
};

describe('idempotent order placement', () => {
  it('returns the same order when a request is retried with the same key', async () => {
    const { table, dish } = await tableWithDish();
    const first = await place(table, dish, 'retry-key-0001');
    const second = await place(table, dish, 'retry-key-0001');

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.replayed).toBe(true);
    expect(second.body.order.trackingToken).toBe(first.body.order.trackingToken);
    expect(await Order.countDocuments()).toBe(1);
  });

  it('treats different keys, and requests without a key, as different orders', async () => {
    const { table, dish } = await tableWithDish();
    await place(table, dish, 'key-number-one');
    await place(table, dish, 'key-number-two');
    await place(table, dish);
    await place(table, dish);
    expect(await Order.countDocuments()).toBe(4);
  });

  it('rejects a malformed key', async () => {
    const { table, dish } = await tableWithDish();
    expect((await place(table, dish, 'short')).status).toBe(400);
    expect((await place(table, dish, 'has spaces in it!')).status).toBe(400);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('creates exactly one order when 25 identical requests arrive at once', async () => {
    const { table, dish } = await tableWithDish();
    const results = await Promise.all(Array.from({ length: 25 }, () => place(table, dish, 'burst-key-0001')));

    const statuses = results.map((r) => r.status);
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 200)).toHaveLength(24);
    expect(new Set(results.map((r) => r.body.order.trackingToken)).size).toBe(1);
    expect(await Order.countDocuments()).toBe(1);
  });
});

describe('concurrent kitchen updates', () => {
  it('applies a status change once when ten identical requests race', async () => {
    const { agent } = await ownerAgent('Busy Kitchen');
    const cat = (await agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
    const dish = (await agent.post('/api/v1/menu-items').send({ category: cat._id, name: 'Naan', price: 45 })).body.item;
    const table = (await agent.post('/api/v1/tables').send({})).body.table;
    await place(table, dish);
    const id = String((await Order.findOne())._id);

    const res = await Promise.all(
      Array.from({ length: 10 }, () => agent.patch(`/api/v1/orders/${id}/status`).send({ status: 'preparing' }))
    );

    expect(res.filter((r) => r.status === 200)).toHaveLength(1);
    expect(res.filter((r) => r.status === 409)).toHaveLength(9);
    const stored = await Order.findById(id);
    expect(stored.status).toBe('preparing');
    expect(stored.statusHistory.map((h) => h.status)).toEqual(['received', 'preparing']);
  });
});
