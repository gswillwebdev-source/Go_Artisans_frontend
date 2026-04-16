require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'https://goartisans.online', 'https://goartisans1.vercel.app'],
    credentials: true,
}));

// Strict CSP Header for security - environment-aware
app.use((req, res, next) => {
    const isDev = process.env.NODE_ENV !== 'production';

    let cspHeader;

    if (isDev) {
        // Development: More permissive to support hot reload and debugging
        cspHeader = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ws:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://accounts.google.com https://github.com https://api.github.com; frame-src 'self' https://accounts.google.com https://github.com;";
    } else {
        // Production: Strict CSP - uses nonces for inline scripts
        cspHeader = "default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://github.com https://api.github.com; frame-src 'self' https://accounts.google.com https://github.com; base-uri 'self'; form-action 'self';";
    }

    res.setHeader('Content-Security-Policy', cspHeader);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// session + passport (required for OAuth)
app.use(session({
    secret: process.env.SESSION_SECRET || 'change_this',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // change secure:true in production with HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

// load passport strategies if present
try { require('./config/passport') } catch (e) { console.warn('passport config not found or failed to load:', e.message) }

// Database Connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    statement_timeout: 30000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.on('connect', () => {
    console.log('Database connected successfully');
});

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Root route for quick check in browser
app.get('/', (req, res) => {
    res.send('Job Seeking App API is running. Use /api/health to check JSON status.');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/completion', require('./routes/completion'));

// Error Handling - show stack in development
app.use((err, req, res, next) => {
    console.error(err);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
        error: 'Internal server error',
        message: isDev ? err.message : undefined,
        stack: isDev ? err.stack : undefined
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, pool };
