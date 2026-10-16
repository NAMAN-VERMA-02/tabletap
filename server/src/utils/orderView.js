// What a diner may see about their order: no internal ids or restaurant data.
const publicOrder = (order) => ({
  trackingToken: order.trackingToken,
  tableNumber: order.tableNumber,
  items: order.items.map(({ name, price, qty, isVeg, note }) => ({ name, price, qty, isVeg, note })),
  subtotal: order.subtotal,
  taxPercent: order.taxPercent,
  tax: order.tax,
  total: order.total,
  customerName: order.customerName,
  note: order.note,
  status: order.status,
  statusHistory: order.statusHistory,
  createdAt: order.createdAt,
});

module.exports = { publicOrder };
