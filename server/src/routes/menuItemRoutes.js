const express = require('express');
const {
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  setAvailability,
  deleteMenuItem,
} = require('../controllers/menuItemController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validateId = require('../middleware/validateId');
const { menuItemCreateSchema, menuItemUpdateSchema, availabilitySchema } = require('../validators/menu');

const router = express.Router();

router.param('id', validateId);
router.use(protect);

router
  .route('/')
  .get(listMenuItems)
  .post(authorize('owner'), validate(menuItemCreateSchema), createMenuItem);

router
  .route('/:id')
  .get(getMenuItem)
  .patch(authorize('owner'), validate(menuItemUpdateSchema), updateMenuItem)
  .delete(authorize('owner'), deleteMenuItem);

// Owner or staff
router.patch('/:id/availability', validate(availabilitySchema), setAvailability);

module.exports = router;
