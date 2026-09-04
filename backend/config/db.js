const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

mongoose.set('bufferCommands', false);

const DEFAULT_DATABASE_NAME = 'landline_properties';
let connectionPromise = null;

function databaseName() {
  const name = (process.env.MONGODB_DB_NAME || DEFAULT_DATABASE_NAME).trim();
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(name)) {
    throw new Error('MONGODB_DB_NAME may contain only letters, numbers, underscores and hyphens.');
  }
  if (['admin', 'config', 'local'].includes(name.toLowerCase())) {
    throw new Error('MONGODB_DB_NAME must be an application database, not a MongoDB system database.');
  }
  return name;
}

function positiveInteger(value, fallback, maximum) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= maximum ? parsed : fallback;
}

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('MONGODB_URI must be set to a valid MongoDB connection string.');
  }

  connectionPromise = mongoose.connect(uri, {
    dbName: databaseName(),
    maxPoolSize: positiveInteger(process.env.MONGODB_MAX_POOL_SIZE, 10, 100),
    serverSelectionTimeoutMS: positiveInteger(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10000, 60000),
    autoIndex: process.env.MONGODB_AUTO_INDEX !== 'false'
  }).then(() => {
    connectionPromise = null;
    return mongoose.connection;
  }).catch((error) => {
    connectionPromise = null;
    throw error;
  });

  return connectionPromise;
}

async function testConnection({ exitOnFailure = false, quiet = false } = {}) {
  try {
    const connection = await connectDatabase();
    await connection.db.admin().command({ ping: 1 });
    if (!quiet) console.log(`MongoDB connected: ${connection.name}`);
    return true;
  } catch (error) {
    if (!quiet) console.error('MongoDB connection failed:', error.message);
    if (exitOnFailure) process.exitCode = 1;
    throw error;
  }
}

async function disconnectDatabase() {
  connectionPromise = null;
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
}

module.exports = {
  mongoose,
  databaseName,
  connectDatabase,
  testConnection,
  disconnectDatabase
};
