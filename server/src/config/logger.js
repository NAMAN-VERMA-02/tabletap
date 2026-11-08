const pino = require('pino');
const env = require('./env');

// JSON logs on stdout; credentials never reach the log line.
module.exports = pino({
  level: env.logLevel,
  redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
});
