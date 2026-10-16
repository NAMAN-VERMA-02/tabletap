const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { round2 } = require('../utils/money');
const { startOfLocalDay, lastNDays, isValidTimeZone } = require('../utils/time');

const RANGES = { today: 1, '7d': 7, '30d': 30 };

// GET /api/v1/analytics/summary?range=today|7d|30d
// One aggregation with $facet computes every number on the dashboard in a single DB round trip.
const summary = asyncHandler(async (req, res) => {
  const range = req.query.range || '7d';
  const days = RANGES[range];
  if (!days) throw new ApiError(400, 'range must be one of: today, 7d, 30d');

  const restaurant = await Restaurant.findById(req.user.restaurant).select('timezone currency').lean();
  const timezone = isValidTimeZone(restaurant?.timezone) ? restaurant.timezone : 'UTC';
  const now = new Date();
  const since = startOfLocalDay(now, timezone, days - 1);

  const base = { restaurant: req.user.restaurant, createdAt: { $gte: since } };

  const [result] = await Order.aggregate([
    { $match: base },
    {
      $facet: {
        totals: [
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: null, revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgOrder: { $avg: '$total' } } },
        ],
        cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
        daily: [
          { $match: { status: { $ne: 'cancelled' } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone } },
              revenue: { $sum: '$total' },
              orders: { $sum: 1 },
            },
          },
        ],
        topItems: [
          { $match: { status: { $ne: 'cancelled' } } },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.menuItem',
              name: { $last: '$items.name' },
              qty: { $sum: '$items.qty' },
              revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
            },
          },
          { $sort: { qty: -1, revenue: -1 } },
          { $limit: 5 },
        ],
        byHour: [
          { $match: { status: { $ne: 'cancelled' } } },
          { $group: { _id: { $hour: { date: '$createdAt', timezone } }, orders: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const totals = result.totals[0] || { revenue: 0, orders: 0, avgOrder: 0 };

  // Fill in days and hours with no orders so the charts don't skip gaps.
  const dailyMap = new Map(result.daily.map((d) => [d._id, d]));
  const daily = lastNDays(now, timezone, days).map((date) => ({
    date,
    revenue: round2(dailyMap.get(date)?.revenue || 0),
    orders: dailyMap.get(date)?.orders || 0,
  }));

  const hourMap = new Map(result.byHour.map((h) => [h._id, h.orders]));
  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: hourMap.get(hour) || 0 }));
  const busiest = byHour.reduce((best, h) => (h.orders > best.orders ? h : best), { hour: null, orders: 0 });

  res.json({
    success: true,
    range,
    timezone,
    currency: restaurant?.currency || 'INR',
    since,
    totals: {
      revenue: round2(totals.revenue),
      orders: totals.orders,
      avgOrderValue: round2(totals.avgOrder || 0),
      cancelled: result.cancelled[0]?.count || 0,
      peakHour: busiest.orders ? busiest.hour : null,
    },
    daily,
    topItems: result.topItems.map((t) => ({ name: t.name, qty: t.qty, revenue: round2(t.revenue) })),
    byHour,
  });
});

module.exports = { summary };
