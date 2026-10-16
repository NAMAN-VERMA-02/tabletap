const Table = require('../models/Table');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { tableUrl, qrDataUrl } = require('../utils/qr');

async function findOwn(req) {
  const table = await Table.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
  if (!table) throw new ApiError(404, 'Table not found');
  return table;
}

async function assertNumberFree(restaurant, number, exceptId) {
  const clash = await Table.exists({ restaurant, number, ...(exceptId && { _id: { $ne: exceptId } }) });
  if (clash) throw new ApiError(409, `Table ${number} already exists`);
}

// GET /api/v1/tables
const listTables = asyncHandler(async (req, res) => {
  const tables = await Table.find({ restaurant: req.user.restaurant }).sort({ number: 1 }).lean();
  res.json({ success: true, tables });
});

// POST /api/v1/tables — number defaults to the next free one.
const createTable = asyncHandler(async (req, res) => {
  const restaurant = req.user.restaurant;
  let { number } = req.body;
  if (number === undefined) {
    const last = await Table.findOne({ restaurant }).sort({ number: -1 }).select('number').lean();
    number = (last?.number || 0) + 1;
  }
  await assertNumberFree(restaurant, number);
  const table = await Table.create({ ...req.body, number, restaurant });
  res.status(201).json({ success: true, table });
});

// PATCH /api/v1/tables/:id
const updateTable = asyncHandler(async (req, res) => {
  const table = await findOwn(req);
  if (req.body.number !== undefined) await assertNumberFree(req.user.restaurant, req.body.number, table._id);
  Object.assign(table, req.body);
  await table.save();
  res.json({ success: true, table });
});

// DELETE /api/v1/tables/:id
const deleteTable = asyncHandler(async (req, res) => {
  const table = await findOwn(req);
  await table.deleteOne();
  res.json({ success: true });
});

// GET /api/v1/tables/:id/qr
const getTableQr = asyncHandler(async (req, res) => {
  const table = await findOwn(req);
  res.json({ success: true, url: tableUrl(table.qrToken), qr: await qrDataUrl(table.qrToken) });
});

// POST /api/v1/tables/:id/regenerate-qr — invalidates the old printed QR (e.g. if a photo of it leaks).
const regenerateQr = asyncHandler(async (req, res) => {
  const table = await findOwn(req);
  table.qrToken = Table.newQrToken();
  await table.save();
  res.json({ success: true, table, url: tableUrl(table.qrToken), qr: await qrDataUrl(table.qrToken) });
});

// GET /api/v1/tables/qr-sheet — every active table with its QR, for the printable sheet.
const qrSheet = asyncHandler(async (req, res) => {
  const tables = await Table.find({ restaurant: req.user.restaurant, isActive: true }).sort({ number: 1 }).lean();
  const codes = await Promise.all(
    tables.map(async (t) => ({
      _id: t._id,
      number: t.number,
      label: t.label,
      url: tableUrl(t.qrToken),
      qr: await qrDataUrl(t.qrToken),
    }))
  );
  res.json({ success: true, tables: codes });
});

module.exports = { listTables, createTable, updateTable, deleteTable, getTableQr, regenerateQr, qrSheet };
