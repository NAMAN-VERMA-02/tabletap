const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { emitOrderUpdated } = require('../socket');

// Allowed moves. Orders only go forward; served and cancelled are final.
const TRANSITIONS = {
  received: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served'],
  served: [],
  cancelled: [],
};

const ACTIVE = ['received', 'preparing', 'ready'];

// GET /api/v1/orders?status=received,preparing&date=2026-10-16&page=1&limit=20
const listOrders = asyncHandler(async (req, res) => {
  const filter = { restaurant: req.user.restaurant };
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  if (req.query.status) {
    const statuses = String(req.query.status).split(',').filter((s) => Order.STATUSES.includes(s));
    if (!statuses.length) throw new ApiError(400, 'Invalid status filter');
    filter.status = { $in: statuses };
  }
  if (req.query.date) {
    const start = new Date(`${req.query.date}T00:00:00`);
    if (Number.isNaN(start.getTime())) throw new ApiError(400, 'Invalid date, use YYYY-MM-DD');
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    filter.createdAt = { $gte: start, $lt: end };
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
  ]);
  res.json({ success: true, orders, page, limit, total, pages: Math.ceil(total / limit) });
});

// GET /api/v1/orders/active — everything the kitchen still has to deal with, oldest first.
const activeOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ restaurant: req.user.restaurant, status: { $in: ACTIVE } })
    .sort({ createdAt: 1 })
    .lean();
  res.json({ success: true, orders });
});

// PATCH /api/v1/orders/:id/status { status }
const updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
  if (!order) throw new ApiError(404, 'Order not found');

  if (status === 'cancelled' && req.user.role !== 'owner') {
    throw new ApiError(403, 'Only the owner can cancel orders');
  }
  if (!TRANSITIONS[order.status].includes(status)) {
    throw new ApiError(409, `Can't move an order from "${order.status}" to "${status}"`);
  }

  order.status = status;
  await order.save();

  const plain = order.toObject();
  emitOrderUpdated(plain);
  res.json({ success: true, order: plain });
});

module.exports = { listOrders, activeOrders, updateStatus, TRANSITIONS };
