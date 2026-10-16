const { z } = require('zod');

const tableCreateSchema = z.object({
  number: z.number({ invalid_type_error: 'Table number must be a number' }).int().min(1).max(9999),
  label: z.string().trim().max(40).optional(),
  seats: z.number().int().min(1).max(50).optional(),
  isActive: z.boolean().optional(),
});

const tableUpdateSchema = tableCreateSchema.partial().refine((v) => Object.keys(v).length > 0, 'Nothing to update');

module.exports = { tableCreateSchema, tableUpdateSchema };
