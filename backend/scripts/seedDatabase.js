const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { connectDatabase, disconnectDatabase, databaseName } = require('../config/db');
const { ensureDatabaseInitialized } = require('../services/initializeDatabase');

async function seedDatabase() {
  await connectDatabase();
  const result = await ensureDatabaseInitialized();
  console.log(`MongoDB database ${databaseName()} is ready with ${result.locations} default locations and global settings.`);
}

seedDatabase()
  .catch((error) => {
    console.error('Failed to initialise MongoDB:', error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase().catch(() => {}));
