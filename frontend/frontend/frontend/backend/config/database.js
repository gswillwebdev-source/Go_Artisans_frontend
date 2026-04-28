const { Pool } = require('pg');

// Use Supabase connection string if available, otherwise fallback to individual env vars
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
    // Fallback configuration for local development
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'job_seeking_app',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
    ssl: connectionString ? { rejectUnauthorized: false } : false, // Enable SSL for Supabase
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.on('connect', () => {
    console.log('Database connected successfully');
});

module.exports = pool;
