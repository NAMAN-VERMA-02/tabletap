const crypto = require('crypto');
const mongoose = require('mongoose');

const STATUSES = ['received', 'preparing', 'ready', 'served', 'cancelled'];

// Name and price are copied from the menu at order time, so editing or deleting a
// dish later never changes what an old order (or its bill) says.
const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    isVeg: { type: Boolean, default: true },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: 'Table', required: true },
    tableNumber: { type: Number, required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    subtotal: { type: Number, required: true },
    taxPercent: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    customerName: { type: String, trim: true, default: '' },
    note: { type: String, trim: true, default: '' },
    status: { type: String, enum: STATUSES, default: 'received' },
    statusHistory: [{ status: { type: String, enum: STATUSES }, at: { type: Date, default: Date.now }, _id: false }],
    // Random token for the diner's tracking link. Mongo ObjectIds are partly
    // predictable, so we don't expose them in public URLs.
    trackingToken: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(12).toString('hex'),
    },
  },
  { timestamps: true }
);

orderSchema.index({ restaurant: 1, status: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, createdAt: -1 });

orderSchema.pre('save', function recordStatus(next) {
  if (this.isNew || this.isModified('status')) this.statusHistory.push({ status: this.status });
  next();
});

const Order = mongoose.model('Order', orderSchema);
Order.STATUSES = STATUSES;

module.exports = Order;
