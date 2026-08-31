const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  charset: 'utf8mb4',
  timezone: 'Z',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined
});

async function testConnection({ exitOnFailure = true, quiet = false } = {}) {
  try {
    const conn = await pool.getConnection();
    if (!quiet) console.log('MySQL connected:', process.env.DB_NAME);
    conn.release();
    return true;
  } catch (err) {
    if (!quiet) console.error('MySQL connection failed:', err.message);
    if (exitOnFailure) process.exit(1);
    throw err;
  }
}

module.exports = { pool, testConnection };
