const QRCode = require('qrcode');
const env = require('../config/env');

// The page a diner lands on after scanning (built in the ordering step).
const tableUrl = (qrToken) => `${env.clientUrl}/t/${qrToken}`;

// PNG data URL, ready to drop into an <img src>.
const qrDataUrl = (qrToken) =>
  QRCode.toDataURL(tableUrl(qrToken), { width: 512, margin: 1, errorCorrectionLevel: 'M' });

module.exports = { tableUrl, qrDataUrl };
