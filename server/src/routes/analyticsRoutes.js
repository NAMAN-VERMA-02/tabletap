const express = require('express');
const { summary } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('owner'));
router.get('/summary', summary);

module.exports = router;
