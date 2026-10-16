const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { priceOrder } = require('../utils/money');

// Resolves a QR token to its (active) table and restaurant.
async function resolveTable(qrToken) {
  const table = await Table.findOne({ qrToken, isActive: true }).lean();
  if (!table) throw new ApiError(404, 'This QR code is not valid. Please ask the staff for help.');
  const restaurant = await Restaurant.findById(table.restaurant).lean();
  if (!restaurant) throw new ApiError(404, 'Restaurant not found');
  return { table, restaurant };
}

// Only what a diner needs to see; no internal ids beyond what ordering requires.
const publicOrder = (order) => ({
  trackingToken: order.trackingToken,
  tableNumber: order.tableNumber,
  items: order.items.map(({ name, price, qty, isVeg, note }) => ({ name, price, qty, isVeg, note })),
  subtotal: order.subtotal,
  taxPercent: order.taxPercent,
  tax: order.tax,
  total: order.total,
  customerName: order.customerName,
  note: order.note,
  status: order.status,
  statusHistory: order.statusHistory,
  createdAt: order.createdAt,
});

// GET /api/v1/public/t/:qrToken — the menu a diner sees after scanning.
const getTableMenu = asyncHandler(async (req, res) => {
  const { table, restaurant } = await resolveTable(req.params.qrToken);

  const [categories, items] = await Promise.all([
    Category.find({ restaurant: restaurant._id }).sort({ sortOrder: 1, createdAt: 1 }).select('name').lean(),
    MenuItem.find({ restaurant: restaurant._id, isAvailable: true })
      .sort({ createdAt: 1 })
      .select('category name description price imageUrl isVeg tags')
      .lean(),
  ]);

  // Hide categories with nothing orderable in them.
  const used = new Set(items.map((i) => String(i.category)));

  res.json({
    success: true,
    restaurant: { name: restaurant.name, currency: restaurant.currency, taxPercent: restaurant.taxPercent },
    table: { number: table.number, label: table.label },
    categories: categories.filter((c) => used.has(String(c._id))),
    items,
  });
});

// POST /api/v1/public/t/:qrToken/orders
const placeOrder = asyncHandler(async (req, res) => {
  const { table, restaurant } = await resolveTable(req.params.qrToken);
  const { items: requested, customerName = '', note = '' } = req.body;

  // Look up every dish in THIS restaurant's menu. Prices come from here, never from the client.
  const ids = [...new Set(requested.map((l) => l.menuItem))];
  const menuItems = await MenuItem.find({ _id: { $in: ids }, restaurant: restaurant._id }).lean();
  const byId = new Map(menuItems.map((m) => [String(m._id), m]));

  const missing = ids.filter((id) => !byId.has(id));
  if (missing.length) throw new ApiError(400, 'Some dishes in your cart are not on this menu. Please refresh.');

  const soldOut = menuItems.filter((m) => !m.isAvailable).map((m) => m.name);
  if (soldOut.length) {
    throw new ApiError(409, `Sorry, ${soldOut.join(', ')} just sold out. Please remove it from your cart.`, {
      soldOut,
    });
  }

  const lines = requested.map((l) => {
    const m = byId.get(l.menuItem);
    return { menuItem: m._id, name: m.name, price: m.price, isVeg: m.isVeg, qty: l.qty, note: l.note || '' };
  });
  const totals = priceOrder(lines, restaurant.taxPercent);

  const order = await Order.create({
    restaurant: restaurant._id,
    table: table._id,
    tableNumber: table.number,
    items: lines,
    taxPercent: restaurant.taxPercent,
    ...totals,
    customerName,
    note,
  });

  // Step 6: emit `order:new` to the kitchen display over Socket.io here.

  res.status(201).json({ success: true, order: publicOrder(order) });
});

// GET /api/v1/public/orders/:trackingToken — live status for the diner.
const trackOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ trackingToken: req.params.trackingToken }).lean();
  if (!order) throw new ApiError(404, 'Order not found');
  const restaurant = await Restaurant.findById(order.restaurant).select('name currency').lean();
  res.json({ success: true, order: publicOrder(order), restaurant });
});

module.exports = { getTableMenu, placeOrder, trackOrder };
