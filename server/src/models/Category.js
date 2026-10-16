const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Category names are unique within a restaurant (not globally).
categorySchema.index({ restaurant: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
categorySchema.index({ restaurant: 1, sortOrder: 1 });

module.exports = mongoose.model('Category', categorySchema);
