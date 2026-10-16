const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function findOwn(req) {
  const item = await MenuItem.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
  if (!item) throw new ApiError(404, 'Menu item not found');
  return item;
}

// Stops an owner from attaching an item to another restaurant's category.
async function assertOwnCategory(req, categoryId) {
  const ok = await Category.exists({ _id: categoryId, restaurant: req.user.restaurant });
  if (!ok) throw new ApiError(400, 'Category not found');
}

// GET /api/v1/menu-items?category=&search=&available=
const listMenuItems = asyncHandler(async (req, res) => {
  const filter = { restaurant: req.user.restaurant };
  const { category, search, available } = req.query;

  if (category) filter.category = category;
  if (available === 'true' || available === 'false') filter.isAvailable = available === 'true';
  if (search) {
    const safe = String(search).slice(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = new RegExp(safe, 'i');
  }

  const items = await MenuItem.find(filter).sort({ createdAt: 1 }).lean();
  res.json({ success: true, items });
});

// GET /api/v1/menu-items/:id
const getMenuItem = asyncHandler(async (req, res) => {
  res.json({ success: true, item: await findOwn(req) });
});

// POST /api/v1/menu-items
const createMenuItem = asyncHandler(async (req, res) => {
  await assertOwnCategory(req, req.body.category);
  const item = await MenuItem.create({ ...req.body, restaurant: req.user.restaurant });
  res.status(201).json({ success: true, item });
});

// PATCH /api/v1/menu-items/:id
const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await findOwn(req);
  if (req.body.category) await assertOwnCategory(req, req.body.category);
  Object.assign(item, req.body);
  await item.save();
  res.json({ success: true, item });
});

// PATCH /api/v1/menu-items/:id/availability — staff can mark dishes sold out.
const setAvailability = asyncHandler(async (req, res) => {
  const item = await findOwn(req);
  item.isAvailable = req.body.isAvailable;
  await item.save();
  res.json({ success: true, item });
});

// DELETE /api/v1/menu-items/:id
const deleteMenuItem = asyncHandler(async (req, res) => {
  const item = await findOwn(req);
  await item.deleteOne();
  res.json({ success: true });
});

module.exports = { listMenuItems, getMenuItem, createMenuItem, updateMenuItem, setAvailability, deleteMenuItem };
