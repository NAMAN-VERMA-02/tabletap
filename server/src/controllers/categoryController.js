const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function assertNameFree(restaurant, name, exceptId) {
  const clash = await Category.findOne({
    restaurant,
    name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    ...(exceptId && { _id: { $ne: exceptId } }),
  });
  if (clash) throw new ApiError(409, `A category named "${name}" already exists`);
}

// Every query includes `restaurant: req.user.restaurant`, so one restaurant can never
// read or change another restaurant's data, even with a guessed id.
async function findOwn(req) {
  const category = await Category.findOne({ _id: req.params.id, restaurant: req.user.restaurant });
  if (!category) throw new ApiError(404, 'Category not found');
  return category;
}

// GET /api/v1/categories (with item counts)
const listCategories = asyncHandler(async (req, res) => {
  const restaurant = req.user.restaurant;
  const [categories, counts] = await Promise.all([
    Category.find({ restaurant }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    MenuItem.aggregate([{ $match: { restaurant } }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({
    success: true,
    categories: categories.map((c) => ({ ...c, itemCount: countMap.get(String(c._id)) || 0 })),
  });
});

// POST /api/v1/categories
const createCategory = asyncHandler(async (req, res) => {
  const restaurant = req.user.restaurant;
  await assertNameFree(restaurant, req.body.name);
  const sortOrder = req.body.sortOrder ?? (await Category.countDocuments({ restaurant }));
  const category = await Category.create({ ...req.body, sortOrder, restaurant });
  res.status(201).json({ success: true, category });
});

// PATCH /api/v1/categories/:id
const updateCategory = asyncHandler(async (req, res) => {
  const category = await findOwn(req);
  if (req.body.name) await assertNameFree(req.user.restaurant, req.body.name, category._id);
  Object.assign(category, req.body);
  await category.save();
  res.json({ success: true, category });
});

// DELETE /api/v1/categories/:id — refuses if items still use it, so nothing is orphaned.
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await findOwn(req);
  const itemCount = await MenuItem.countDocuments({ category: category._id });
  if (itemCount > 0) {
    throw new ApiError(409, `Move or delete the ${itemCount} item(s) in "${category.name}" first`);
  }
  await category.deleteOne();
  res.json({ success: true });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
