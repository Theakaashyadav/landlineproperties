const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { connectDatabase, disconnectDatabase, databaseName } = require('../config/db');
const { User } = require('../models');

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin';

  if (!email || !password || password === 'change_me_before_running_seed') {
    throw new Error('Set SEED_ADMIN_EMAIL and a real SEED_ADMIN_PASSWORD in .env before running this script.');
  }
  if (password.length < 8) {
    throw new Error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
  }

  await connectDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    console.log('An admin with this email already exists. No changes made.');
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  await User.create({
    name: String(name).trim().slice(0, 120),
    email: normalizedEmail,
    password_hash: hash,
    role: 'super_admin',
    is_active: 1
  });
  console.log(`Admin account created in ${databaseName()} for ${normalizedEmail}. You can now log in at /admin/login.html`);
}

seedAdmin()
  .catch((error) => {
    console.error('Failed to seed admin:', error.message);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase().catch(() => {}));
