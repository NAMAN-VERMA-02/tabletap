// Creates a demo restaurant with a menu, tables and ~30 days of realistic orders,
// so the dashboard and kitchen have something to show.
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const Category = require('../src/models/Category');
const MenuItem = require('../src/models/MenuItem');
const Table = require('../src/models/Table');
const Order = require('../src/models/Order');
const { priceOrder } = require('../src/utils/money');

const DEMO_EMAIL = 'demo@tabletap.test';
const DEMO_PASSWORD = 'demo12345';

const MENU = {
  Starters: [
    ['Paneer Tikka', 249, true, 'Smoky cottage cheese from the tandoor', ['bestseller']],
    ['Chicken 65', 289, false, 'Crispy, spicy, curry-leaf tempered', ['spicy']],
    ['Hara Bhara Kebab', 199, true, 'Spinach and pea patties'],
  ],
  Mains: [
    ['Dal Makhani', 220, true, 'Black lentils slow-cooked overnight', ['bestseller']],
    ['Butter Chicken', 320, false, 'Tandoori chicken in a buttery tomato gravy'],
    ['Paneer Butter Masala', 280, true, ''],
    ['Veg Biryani', 260, true, 'Fragrant basmati with vegetables'],
  ],
  Breads: [
    ['Butter Naan', 45, true, ''],
    ['Garlic Naan', 60, true, ''],
    ['Tandoori Roti', 30, true, ''],
  ],
  Drinks: [
    ['Mango Lassi', 90, true, ''],
    ['Masala Chai', 40, true, ''],
    ['Fresh Lime Soda', 70, true, ''],
  ],
};

// Rough share of orders per local hour (lunch and dinner rushes).
const HOUR_WEIGHTS = { 11: 2, 12: 6, 13: 8, 14: 5, 15: 2, 16: 1, 17: 2, 18: 3, 19: 7, 20: 9, 21: 7, 22: 3 };

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function pickWeighted(rand, weights) {
  const entries = Object.entries(weights);
  let r = rand() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [key, w] of entries) if ((r -= w) <= 0) return Number(key);
  return Number(entries[0][0]);
}

async function seedDemo({ log = console.log } = {}) {
  // Start clean: remove any previous demo restaurant and its data.
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    const r = existing.restaurant;
    await Promise.all([
      Order.deleteMany({ restaurant: r }),
      Table.deleteMany({ restaurant: r }),
      MenuItem.deleteMany({ restaurant: r }),
      Category.deleteMany({ restaurant: r }),
      User.deleteMany({ restaurant: r }),
      Restaurant.deleteOne({ _id: r }),
    ]);
  }

  const restaurant = await Restaurant.create({ name: 'Spice Garden', slug: `spice-garden-demo-${Date.now()}`, taxPercent: 5 });
  const owner = await User.create({ name: 'Demo Owner', email: DEMO_EMAIL, password: DEMO_PASSWORD, role: 'owner', restaurant: restaurant._id });
  restaurant.owner = owner._id;
  await restaurant.save();

  const items = [];
  let sortOrder = 0;
  for (const [catName, dishes] of Object.entries(MENU)) {
    const cat = await Category.create({ restaurant: restaurant._id, name: catName, sortOrder: sortOrder++ });
    for (const [name, price, isVeg, description, tags = []] of dishes) {
      items.push(await MenuItem.create({ restaurant: restaurant._id, category: cat._id, name, price, isVeg, description, tags }));
    }
  }

  const tables = await Table.insertMany(
    Array.from({ length: 8 }, (_, i) => ({ restaurant: restaurant._id, number: i + 1, seats: i < 4 ? 2 : 4 }))
  );

  // Popular dishes get picked more often.
  const popularity = Object.fromEntries(items.map((it, i) => [i, it.tags.includes('bestseller') ? 5 : it.price < 100 ? 3 : 2]));

  const rand = rng(42);
  const now = new Date();
  const orders = [];
  for (let daysAgo = 29; daysAgo >= 0; daysAgo -= 1) {
    const day = new Date(now.getTime() - daysAgo * 86400000);
    const weekend = [0, 6].includes(day.getDay());
    const count = Math.round((weekend ? 14 : 8) + rand() * 6);
    for (let n = 0; n < count; n += 1) {
      const hour = pickWeighted(rand, HOUR_WEIGHTS);
      // Hours are IST (UTC+5:30); build the UTC instant for that local time.
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(day);
      const at = new Date(`${ymd}T${String(hour).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}:00+05:30`);
      if (at > now) continue;

      const lines = new Map();
      const dishes = 1 + Math.floor(rand() * 4);
      for (let d = 0; d < dishes; d += 1) {
        const it = items[pickWeighted(rand, popularity)];
        const prev = lines.get(String(it._id));
        const qty = 1 + Math.floor(rand() * 2);
        lines.set(String(it._id), {
          menuItem: it._id, name: it.name, price: it.price, isVeg: it.isVeg, qty: (prev?.qty || 0) + qty, note: '',
        });
      }
      const itemLines = [...lines.values()];
      const table = tables[Math.floor(rand() * tables.length)];
      const status = rand() < 0.04 ? 'cancelled' : 'served';
      orders.push({
        restaurant: restaurant._id,
        table: table._id,
        tableNumber: table.number,
        items: itemLines,
        taxPercent: 5,
        ...priceOrder(itemLines, 5),
        status,
        statusHistory: [{ status: 'received', at }, { status, at: new Date(at.getTime() + 25 * 60000) }],
        createdAt: at,
        updatedAt: at,
      });
    }
  }

  // A few live orders so the kitchen display isn't empty.
  ['received', 'received', 'preparing', 'ready'].forEach((status, i) => {
    const at = new Date(now.getTime() - (12 - i * 3) * 60000);
    const it = items[i * 2];
    const line = { menuItem: it._id, name: it.name, price: it.price, isVeg: it.isVeg, qty: 1 + (i % 2), note: i === 0 ? 'less spicy' : '' };
    orders.push({
      restaurant: restaurant._id, table: tables[i]._id, tableNumber: tables[i].number, items: [line], taxPercent: 5,
      ...priceOrder([line], 5), status, statusHistory: [{ status: 'received', at }], createdAt: at, updatedAt: at,
    });
  });

  await Order.insertMany(orders, { timestamps: false });
  log(`Demo data ready: ${items.length} dishes, ${tables.length} tables, ${orders.length} orders.`);
  log(`Log in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

module.exports = { seedDemo, DEMO_EMAIL, DEMO_PASSWORD };
