const express = require('express');
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validateId = require('../middleware/validateId');
const { categoryCreateSchema, categoryUpdateSchema } = require('../validators/menu');

const router = express.Router();

router.param('id', validateId);
router.use(protect);

router
  .route('/')
  .get(listCategories)
  .post(authorize('owner'), validate(categoryCreateSchema), createCategory);

router
  .route('/:id')
  .patch(authorize('owner'), validate(categoryUpdateSchema), updateCategory)
  .delete(authorize('owner'), deleteCategory);

module.exports = router;
