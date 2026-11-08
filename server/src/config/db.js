const mongoose = require('mongoose');

async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  require('./logger').info({ host: mongoose.connection.host, db: mongoose.connection.name }, 'MongoDB connected');
}

module.exports = connectDB;
