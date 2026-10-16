const express = require('express');
const { z } = require('zod');
const { listOrders, activeOrders, updateStatus } = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validateId = require('../middleware/validateId');
const Order = require('../models/Order');

const router = express.Router();

const statusSchema = z.object({ status: z.enum(Order.STATUSES) });

router.param('id', validateId);
router.use(protect); // owner and staff

router.get('/', listOrders);
router.get('/active', activeOrders);
router.patch('/:id/status', validate(statusSchema), updateStatus);

module.exports = router;
