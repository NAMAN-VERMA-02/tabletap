require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/tabletap'),
  JWT_SECRET: z.string().min(1).default('dev-only-secret'),
  JWT_EXPIRES_IN: z.string().min(1).default('7d'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
  throw new Error(`Invalid environment: ${problems}`);
}
const e = parsed.data;

const env = {
  port: e.PORT,
  nodeEnv: e.NODE_ENV,
  mongoUri: e.MONGO_URI,
  jwtSecret: e.JWT_SECRET,
  jwtExpiresIn: e.JWT_EXPIRES_IN,
  clientUrl: e.CLIENT_URL,
  logLevel: e.LOG_LEVEL || (e.NODE_ENV === 'test' ? 'silent' : 'info'),
};

env.isProd = env.nodeEnv === 'production';

if (env.isProd && env.jwtSecret === 'dev-only-secret') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
