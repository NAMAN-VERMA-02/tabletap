const crypto = require('crypto');
const mongoose = require('mongoose');

// Long random token in the QR URL. Unguessable, so nobody can order for a table
// they aren't sitting at by editing the link.
const newQrToken = () => crypto.randomBytes(16).toString('hex');

const tableSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    number: { type: Number, required: true, min: 1 },
    label: { type: String, trim: true, maxlength: 40, default: '' }, // e.g. "Patio", "Window"
    seats: { type: Number, min: 1, max: 50, default: 4 },
    qrToken: { type: String, required: true, unique: true, default: newQrToken },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Table numbers are unique within a restaurant.
tableSchema.index({ restaurant: 1, number: 1 }, { unique: true });

const Table = mongoose.model('Table', tableSchema);
Table.newQrToken = newQrToken;

module.exports = Table;
