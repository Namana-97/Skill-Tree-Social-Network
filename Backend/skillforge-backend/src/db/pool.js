const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'skillforge',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // FIXED: Standardize pool settings for local dev
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, 
});

// Test the connection immediately on start
pool.query('SELECT NOW()', (err) => {
  if (err) {
    console.error('❌ DATABASE CONNECTION ERROR:', err.message);
  } else {
    console.log('📁 Database Connection: SUCCESS');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
  process.exit(-1);
});

module.exports = pool;