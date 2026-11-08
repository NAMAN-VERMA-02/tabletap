const express = require('express');
const rateLimit = require('express-rate-limit');
const { getTableMenu, placeOrder, trackOrder } = require('../controllers/publicController');
const validate = require('../middleware/validate');
const ApiError = require('../utils/ApiError');
const { placeOrderSchema } = require('../validators/order');

// No login on these routes: the QR token itself is the access key.
const router = express.Router();

const tokenFormat = (length) => (_req, _res, next, value) =>
  new RegExp(`^[a-f0-9]{${length}}$`).test(value) ? next() : next(new ApiError(404, 'Not found'));

router.param('qrToken', tokenFormat(32));
router.param('trackingToken', tokenFormat(24));

// Stops someone spamming fake orders at a table.
const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 15,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many orders from this device. Please ask the staff for help.' },
});

router.get('/t/:qrToken', getTableMenu);
// Optional `Idempotency-Key` header: 8-64 chars of letters, digits, `-` or `_`.
const readIdempotencyKey = (req, _res, next) => {
  const key = req.get('Idempotency-Key');
  if (key === undefined) return next();
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(key)) return next(new ApiError(400, 'Invalid Idempotency-Key header'));
  req.idempotencyKey = key;
  next();
};

router.post('/t/:qrToken/orders', orderLimiter, readIdempotencyKey, validate(placeOrderSchema), placeOrder);
router.get('/orders/:trackingToken', trackOrder);

module.exports = router;
