const request = require('supertest');
const { app, setupDB, ownerAgent, staffAgent } = require('./helpers');

setupDB();

describe('tables', () => {
  it('creates tables with auto-numbering, a random QR token, and lists them sorted', async () => {
    const { agent } = await ownerAgent();

    const t1 = await agent.post('/api/v1/tables').send({});
    const t2 = await agent.post('/api/v1/tables').send({ seats: 2, label: 'Window' });
    const t5 = await agent.post('/api/v1/tables').send({ number: 5 });
    const t6 = await agent.post('/api/v1/tables').send({});

    expect(t1.status).toBe(201);
    expect([t1, t2, t5, t6].map((r) => r.body.table.number)).toEqual([1, 2, 5, 6]);
    expect(t1.body.table.qrToken).toMatch(/^[a-f0-9]{32}$/);
    expect(t1.body.table.qrToken).not.toBe(t2.body.table.qrToken);

    const list = await agent.get('/api/v1/tables');
    expect(list.body.tables.map((t) => t.number)).toEqual([1, 2, 5, 6]);
  });

  it('rejects a duplicate table number but allows the same number in another restaurant', async () => {
    const a = await ownerAgent('Cafe A');
    const b = await ownerAgent('Cafe B');
    await a.agent.post('/api/v1/tables').send({ number: 3 });

    expect((await a.agent.post('/api/v1/tables').send({ number: 3 })).status).toBe(409);
    expect((await b.agent.post('/api/v1/tables').send({ number: 3 })).status).toBe(201);
  });

  it('updates and deletes a table', async () => {
    const { agent } = await ownerAgent();
    const t = (await agent.post('/api/v1/tables').send({})).body.table;
    await agent.post('/api/v1/tables').send({}); // table 2

    const updated = await agent.patch(`/api/v1/tables/${t._id}`).send({ seats: 6, isActive: false });
    expect(updated.body.table).toMatchObject({ seats: 6, isActive: false });
    expect((await agent.patch(`/api/v1/tables/${t._id}`).send({ number: 2 })).status).toBe(409);

    expect((await agent.delete(`/api/v1/tables/${t._id}`)).status).toBe(200);
    expect((await agent.get('/api/v1/tables')).body.tables).toHaveLength(1);
  });

  it('validates input', async () => {
    const { agent } = await ownerAgent();
    expect((await agent.post('/api/v1/tables').send({ number: 0 })).status).toBe(400);
    expect((await agent.post('/api/v1/tables').send({ seats: 100 })).status).toBe(400);
  });
});

describe('QR codes', () => {
  it('returns a PNG QR that points at the table URL', async () => {
    const { agent } = await ownerAgent();
    const t = (await agent.post('/api/v1/tables').send({})).body.table;

    const res = await agent.get(`/api/v1/tables/${t._id}/qr`);
    expect(res.status).toBe(200);
    expect(res.body.url).toBe(`http://localhost:5173/t/${t.qrToken}`);
    expect(res.body.qr).toMatch(/^data:image\/png;base64,/);
  });

  it('regenerating the QR changes the token so the old printed code stops matching', async () => {
    const { agent } = await ownerAgent();
    const t = (await agent.post('/api/v1/tables').send({})).body.table;

    const res = await agent.post(`/api/v1/tables/${t._id}/regenerate-qr`);
    expect(res.body.table.qrToken).not.toBe(t.qrToken);
    expect(res.body.url).toContain(res.body.table.qrToken);
  });

  it('builds a print sheet of active tables only', async () => {
    const { agent } = await ownerAgent();
    await agent.post('/api/v1/tables').send({});
    const t2 = (await agent.post('/api/v1/tables').send({})).body.table;
    await agent.post('/api/v1/tables').send({});
    await agent.patch(`/api/v1/tables/${t2._id}`).send({ isActive: false });

    const res = await agent.get('/api/v1/tables/qr-sheet');
    expect(res.body.tables.map((t) => t.number)).toEqual([1, 3]);
    expect(res.body.tables[0].qr).toMatch(/^data:image\/png;base64,/);
  });
});

describe('table access control', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/v1/tables')).status).toBe(401);
  });

  it("never lets one restaurant see or change another's tables or QR codes", async () => {
    const a = await ownerAgent('Cafe A');
    const b = await ownerAgent('Cafe B');
    const t = (await a.agent.post('/api/v1/tables').send({})).body.table;

    expect((await b.agent.get('/api/v1/tables')).body.tables).toHaveLength(0);
    expect((await b.agent.get('/api/v1/tables/qr-sheet')).body.tables).toHaveLength(0);
    expect((await b.agent.get(`/api/v1/tables/${t._id}/qr`)).status).toBe(404);
    expect((await b.agent.post(`/api/v1/tables/${t._id}/regenerate-qr`)).status).toBe(404);
    expect((await b.agent.patch(`/api/v1/tables/${t._id}`).send({ seats: 1 })).status).toBe(404);
    expect((await b.agent.delete(`/api/v1/tables/${t._id}`)).status).toBe(404);
  });

  it('lets staff list tables but not change them or see QR codes', async () => {
    const { agent: owner, user } = await ownerAgent();
    const t = (await owner.post('/api/v1/tables').send({})).body.table;
    const staff = await staffAgent(user.restaurant);

    expect((await staff.get('/api/v1/tables')).body.tables).toHaveLength(1);
    expect((await staff.post('/api/v1/tables').send({})).status).toBe(403);
    expect((await staff.patch(`/api/v1/tables/${t._id}`).send({ seats: 1 })).status).toBe(403);
    expect((await staff.delete(`/api/v1/tables/${t._id}`)).status).toBe(403);
    expect((await staff.get(`/api/v1/tables/${t._id}/qr`)).status).toBe(403);
    expect((await staff.get('/api/v1/tables/qr-sheet')).status).toBe(403);
  });
});
