const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid item');

// Deliberately no `price` field: zod strips unknown keys, so whatever price a
// client sends is thrown away and the server uses the menu price.
const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItem: objectId,
        qty: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Max 20 of one dish'),
        note: z.string().trim().max(100).optional(),
      })
    )
    .min(1, 'Your cart is empty')
    .max(30, 'Too many different dishes in one order'),
  customerName: z.string().trim().max(40).optional(),
  note: z.string().trim().max(200).optional(),
});

module.exports = { placeOrderSchema };
