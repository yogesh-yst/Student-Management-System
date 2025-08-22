// db.js - PostgreSQL connection configuration
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'cmm_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
        console.log('Connected to PostgreSQL database');
    }
});

pool.on('error', (err) => {
    console.error('PostgreSQL pool error:', err);
});

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
};