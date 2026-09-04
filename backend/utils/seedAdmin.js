const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const { connectDatabase, disconnectDatabase, databaseName } = require('../config/db');
const { seedAdminFromEnvironment } = require('../services/initializeDatabase');

async function seedAdmin() {
  await connectDatabase();
  const result = await seedAdminFromEnvironment({ required: true });
  if (!result.created) {
    console.log('An admin with this email already exists. No changes made.');
    return;
  }
  console.log(`Admin account created in ${databaseName()} for ${result.email}. You can now log in at /admin/login.html`);
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin:', error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase().catch(() => {}));
