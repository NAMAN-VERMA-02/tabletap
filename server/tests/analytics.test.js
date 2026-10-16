const mongoose = require('mongoose');
const request = require('supertest');
const { app, setupDB, ownerAgent, staffAgent } = require('./helpers');
const Order = require('../src/models/Order');
const { startOfLocalDay } = require('../src/utils/time');

setupDB();

const TZ = 'Asia/Kolkata'; // the default restaurant timezone
const HOUR = 3600000;
const dosa = new mongoose.Types.ObjectId();
const chai = new mongoose.Types.ObjectId();

// Inserts orders straight into the collection so we control createdAt exactly.
async function seed(restaurantId, specs) {
  const restaurant = new mongoose.Types.ObjectId(restaurantId);
  await Order.collection.insertMany(
    specs.map((s, i) => {
      const subtotal = s.items.reduce((sum, it) => sum + it.price * it.qty, 0);
      return {
        restaurant,
        table: new mongoose.Types.ObjectId(),
        tableNumber: 1,
        items: s.items,
        subtotal,
        taxPercent: 0,
        tax: 0,
        total: subtotal,
        status: s.status || 'served',
        statusHistory: [],
        trackingToken: `${String(i).padStart(4, '0')}${'a'.repeat(20)}`,
        createdAt: s.at,
        updatedAt: s.at,
      };
    })
  );
}

const line = (menuItem, name, price, qty) => ({ menuItem, name, price, qty, isVeg: true, note: '' });

describe('analytics summary', () => {
  it('computes revenue, order count, AOV, top items, daily and hourly breakdowns', async () => {
    const { agent, user } = await ownerAgent();
    const today = startOfLocalDay(new Date(), TZ);

    await seed(user.restaurant, [
      // today 09:30 local
      { at: new Date(today.getTime() + 9.5 * HOUR), items: [line(dosa, 'Dosa', 100, 2), line(chai, 'Chai', 20, 1)] },
      // today 13:15 local
      { at: new Date(today.getTime() + 13.25 * HOUR), items: [line(chai, 'Chai', 20, 5)] },
      // today 13:45 local, cancelled: must not count toward revenue or items
      { at: new Date(today.getTime() + 13.75 * HOUR), items: [line(dosa, 'Dosa', 100, 10)], status: 'cancelled' },
      // yesterday 13:00 local
      { at: new Date(today.getTime() - 11 * HOUR), items: [line(dosa, 'Dosa', 100, 1)] },
      // 10 days ago: outside 7d
      { at: new Date(today.getTime() - 10 * 24 * HOUR), items: [line(dosa, 'Dosa', 100, 3)] },
    ]);

    const res = await agent.get('/api/v1/analytics/summary?range=7d');
    expect(res.status).toBe(200);
    // 220 + 100 + 100 = 420 over 3 orders
    expect(res.body.totals).toEqual({ revenue: 420, orders: 3, avgOrderValue: 140, cancelled: 1, peakHour: 13 });

    expect(res.body.daily).toHaveLength(7);
    const last = res.body.daily.at(-1);
    const prev = res.body.daily.at(-2);
    expect(last).toMatchObject({ revenue: 320, orders: 2 });
    expect(prev).toMatchObject({ revenue: 100, orders: 1 });
    expect(res.body.daily.slice(0, 5).every((d) => d.revenue === 0)).toBe(true);

    // Chai: 6 sold; Dosa: 3 sold (cancelled 10 excluded).
    expect(res.body.topItems).toEqual([
      { name: 'Chai', qty: 6, revenue: 120 },
      { name: 'Dosa', qty: 3, revenue: 300 },
    ]);

    expect(res.body.byHour).toHaveLength(24);
    expect(res.body.byHour[9].orders).toBe(1);
    expect(res.body.byHour[13].orders).toBe(2);
  });

  it('respects the range', async () => {
    const { agent, user } = await ownerAgent();
    const today = startOfLocalDay(new Date(), TZ);
    await seed(user.restaurant, [
      { at: new Date(today.getTime() + 10 * HOUR), items: [line(dosa, 'Dosa', 100, 1)] },
      { at: new Date(today.getTime() - 10 * 24 * HOUR), items: [line(dosa, 'Dosa', 100, 1)] },
    ]);

    expect((await agent.get('/api/v1/analytics/summary?range=today')).body.totals.orders).toBe(1);
    const month = (await agent.get('/api/v1/analytics/summary?range=30d')).body;
    expect(month.totals.orders).toBe(2);
    expect(month.daily).toHaveLength(30);
  });

  it('returns zeros (not errors) when there are no orders', async () => {
    const { agent } = await ownerAgent();
    const res = await agent.get('/api/v1/analytics/summary');
    expect(res.body.totals).toEqual({ revenue: 0, orders: 0, avgOrderValue: 0, cancelled: 0, peakHour: null });
    expect(res.body.topItems).toEqual([]);
  });

  it('rejects an unknown range', async () => {
    const { agent } = await ownerAgent();
    expect((await agent.get('/api/v1/analytics/summary?range=1y')).status).toBe(400);
  });

  it("only counts the owner's own restaurant and is owner-only", async () => {
    const a = await ownerAgent('Cafe A');
    const b = await ownerAgent('Cafe B');
    const today = startOfLocalDay(new Date(), TZ);
    await seed(a.user.restaurant, [{ at: new Date(today.getTime() + 10 * HOUR), items: [line(dosa, 'Dosa', 100, 1)] }]);

    expect((await b.agent.get('/api/v1/analytics/summary')).body.totals.orders).toBe(0);

    const staff = await staffAgent(a.user.restaurant);
    expect((await staff.get('/api/v1/analytics/summary')).status).toBe(403);
    expect((await request(app).get('/api/v1/analytics/summary')).status).toBe(401);
  });
});
