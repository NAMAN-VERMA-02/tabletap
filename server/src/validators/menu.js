const { z } = require('zod');
const mongoose = require('mongoose');

const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50),
  sortOrder: z.number().int().min(0).optional(),
});

const categoryUpdateSchema = categoryCreateSchema.partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const menuItemCreateSchema = z.object({
  category: objectId,
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(300).optional(),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative')
    .max(100000)
    .transform((v) => Math.round(v * 100) / 100),
  imageUrl: z.union([z.string().trim().url('Image must be a valid URL'), z.literal('')]).optional(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1).max(20)).max(10).optional(),
});

const menuItemUpdateSchema = menuItemCreateSchema.partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');

const availabilitySchema = z.object({ isAvailable: z.boolean() });

module.exports = {
  categoryCreateSchema,
  categoryUpdateSchema,
  menuItemCreateSchema,
  menuItemUpdateSchema,
  availabilitySchema,
};
