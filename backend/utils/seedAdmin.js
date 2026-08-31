require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

(async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || 'Admin';

  if (!email || !password || password === 'change_me_before_running_seed') {
    console.error('Set SEED_ADMIN_EMAIL and a real SEED_ADMIN_PASSWORD in .env before running this script.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('SEED_ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      console.log('An admin with this email already exists. No changes made.');
      process.exit(0);
    }

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'super_admin', 1)`,
      [name, email, hash]
    );
    console.log(`Admin account created for ${email}. You can now log in at /admin/login.html`);
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed admin:', err.message);
    process.exit(1);
  }
})();
