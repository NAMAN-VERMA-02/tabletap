const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const menuItemRoutes = require('./routes/menuItemRoutes');
const tableRoutes = require('./routes/tableRoutes');
const publicRoutes = require('./routes/publicRoutes');
const orderRoutes = require('./routes/orderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

// Proxies in front of the app: 1 = Render; 2 = Render + Vercel's /api rewrite. Needed so rate
// limits see each visitor's real IP instead of the proxy's.
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
if (env.nodeEnv === 'development') app.use(morgan('dev'));

app.get('/api/v1/health', (_req, res) => res.json({ success: true, status: 'ok' }));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/menu-items', menuItemRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
