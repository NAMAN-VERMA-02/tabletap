const express = require('express');
const {
  listTables,
  createTable,
  updateTable,
  deleteTable,
  getTableQr,
  regenerateQr,
  qrSheet,
} = require('../controllers/tableController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const validateId = require('../middleware/validateId');
const { tableCreateSchema, tableUpdateSchema } = require('../validators/table');

const router = express.Router();

router.param('id', validateId);
router.use(protect);

router
  .route('/')
  .get(listTables)
  .post(authorize('owner'), validate(tableCreateSchema.partial({ number: true })), createTable);

// Must come before /:id so "qr-sheet" isn't treated as an id.
router.get('/qr-sheet', authorize('owner'), qrSheet);

router
  .route('/:id')
  .patch(authorize('owner'), validate(tableUpdateSchema), updateTable)
  .delete(authorize('owner'), deleteTable);

router.get('/:id/qr', authorize('owner'), getTableQr);
router.post('/:id/regenerate-qr', authorize('owner'), regenerateQr);

module.exports = router;
