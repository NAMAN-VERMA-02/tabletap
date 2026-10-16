const request = require('supertest');
const { app, setupDB, ownerAgent, staffAgent } = require('./helpers');

setupDB();

describe('categories', () => {
  it('creates, lists (with item counts), renames and deletes a category', async () => {
    const { agent } = await ownerAgent();

    const created = await agent.post('/api/v1/categories').send({ name: 'Starters' });
    expect(created.status).toBe(201);
    expect(created.body.category.sortOrder).toBe(0);
    const id = created.body.category._id;

    await agent.post('/api/v1/categories').send({ name: 'Mains' });
    const list = await agent.get('/api/v1/categories');
    expect(list.body.categories.map((c) => c.name)).toEqual(['Starters', 'Mains']);
    expect(list.body.categories[0].itemCount).toBe(0);

    const renamed = await agent.patch(`/api/v1/categories/${id}`).send({ name: 'Small plates' });
    expect(renamed.body.category.name).toBe('Small plates');

    expect((await agent.delete(`/api/v1/categories/${id}`)).status).toBe(200);
    expect((await agent.get('/api/v1/categories')).body.categories).toHaveLength(1);
  });

  it('rejects a duplicate name in the same restaurant (case-insensitive) but allows it elsewhere', async () => {
    const a = await ownerAgent('Cafe A');
    const b = await ownerAgent('Cafe B');
    await a.agent.post('/api/v1/categories').send({ name: 'Drinks' });

    expect((await a.agent.post('/api/v1/categories').send({ name: 'drinks' })).status).toBe(409);
    expect((await b.agent.post('/api/v1/categories').send({ name: 'Drinks' })).status).toBe(201);
  });

  it('refuses to delete a category that still has items', async () => {
    const { agent } = await ownerAgent();
    const cat = (await agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
    await agent.post('/api/v1/menu-items').send({ category: cat._id, name: 'Dal Makhani', price: 220 });

    const res = await agent.delete(`/api/v1/categories/${cat._id}`);
    expect(res.status).toBe(409);
  });
});

describe('menu items', () => {
  async function setup() {
    const owner = await ownerAgent();
    const cat = (await owner.agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
    return { ...owner, cat };
  }

  it('runs full CRUD on a menu item', async () => {
    const { agent, cat } = await setup();

    const created = await agent
      .post('/api/v1/menu-items')
      .send({ category: cat._id, name: 'Paneer Tikka', price: 249.999, isVeg: true, tags: ['spicy'] });
    expect(created.status).toBe(201);
    expect(created.body.item.price).toBe(250); // rounded to 2 decimals
    const id = created.body.item._id;

    expect((await agent.get(`/api/v1/menu-items/${id}`)).body.item.name).toBe('Paneer Tikka');

    const updated = await agent.patch(`/api/v1/menu-items/${id}`).send({ price: 279 });
    expect(updated.body.item.price).toBe(279);

    expect((await agent.delete(`/api/v1/menu-items/${id}`)).status).toBe(200);
    expect((await agent.get(`/api/v1/menu-items/${id}`)).status).toBe(404);
  });

  it('filters by category, search and availability', async () => {
    const { agent, cat } = await setup();
    const drinks = (await agent.post('/api/v1/categories').send({ name: 'Drinks' })).body.category;
    await agent.post('/api/v1/menu-items').send({ category: cat._id, name: 'Butter Chicken', price: 320, isVeg: false });
    await agent.post('/api/v1/menu-items').send({ category: drinks._id, name: 'Mango Lassi', price: 90 });
    await agent
      .post('/api/v1/menu-items')
      .send({ category: drinks._id, name: 'Masala Chai', price: 40, isAvailable: false });

    expect((await agent.get(`/api/v1/menu-items?category=${drinks._id}`)).body.items).toHaveLength(2);
    expect((await agent.get('/api/v1/menu-items?search=lass')).body.items[0].name).toBe('Mango Lassi');
    expect((await agent.get('/api/v1/menu-items?available=false')).body.items[0].name).toBe('Masala Chai');
  });

  it('validates input', async () => {
    const { agent, cat } = await setup();
    const res = await agent.post('/api/v1/menu-items').send({ category: cat._id, name: '', price: -5 });
    expect(res.status).toBe(400);
    expect(res.body.details.map((d) => d.field)).toEqual(expect.arrayContaining(['name', 'price']));

    expect((await agent.get('/api/v1/menu-items/not-an-id')).status).toBe(400);
  });
});

describe('access control', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/v1/categories')).status).toBe(401);
    expect((await request(app).get('/api/v1/menu-items')).status).toBe(401);
  });

  it("never lets one restaurant see or change another's menu", async () => {
    const a = await ownerAgent('Cafe A');
    const b = await ownerAgent('Cafe B');
    const catA = (await a.agent.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
    const itemA = (await a.agent.post('/api/v1/menu-items').send({ category: catA._id, name: 'Biryani', price: 300 }))
      .body.item;

    expect((await b.agent.get('/api/v1/menu-items')).body.items).toHaveLength(0);
    expect((await b.agent.get('/api/v1/categories')).body.categories).toHaveLength(0);
    expect((await b.agent.get(`/api/v1/menu-items/${itemA._id}`)).status).toBe(404);
    expect((await b.agent.patch(`/api/v1/menu-items/${itemA._id}`).send({ price: 1 })).status).toBe(404);
    expect((await b.agent.delete(`/api/v1/menu-items/${itemA._id}`)).status).toBe(404);
    expect((await b.agent.patch(`/api/v1/categories/${catA._id}`).send({ name: 'x' })).status).toBe(404);
    expect((await b.agent.delete(`/api/v1/categories/${catA._id}`)).status).toBe(404);

    // B cannot attach its own item to A's category either.
    const sneaky = await b.agent.post('/api/v1/menu-items').send({ category: catA._id, name: 'Fake', price: 1 });
    expect(sneaky.status).toBe(400);
  });

  it('lets staff read the menu and toggle availability, but not edit it', async () => {
    const { agent: owner, user } = await ownerAgent();
    const cat = (await owner.post('/api/v1/categories').send({ name: 'Mains' })).body.category;
    const item = (await owner.post('/api/v1/menu-items').send({ category: cat._id, name: 'Dosa', price: 120 })).body.item;
    const staff = await staffAgent(user.restaurant);

    expect((await staff.get('/api/v1/menu-items')).body.items).toHaveLength(1);
    expect((await staff.post('/api/v1/categories').send({ name: 'Desserts' })).status).toBe(403);
    expect((await staff.patch(`/api/v1/menu-items/${item._id}`).send({ price: 1 })).status).toBe(403);
    expect((await staff.delete(`/api/v1/menu-items/${item._id}`)).status).toBe(403);

    const toggled = await staff.patch(`/api/v1/menu-items/${item._id}/availability`).send({ isAvailable: false });
    expect(toggled.status).toBe(200);
    expect(toggled.body.item.isAvailable).toBe(false);
  });
});
