const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const pool = require('./database');
const bcrypt = require('bcryptjs');

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value;
                if (!email) {
                    return done(new Error('No email found in Google profile'));
                }

                const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

                if (result.rows.length > 0) {
                    return done(null, result.rows[0]);
                }

                const firstName = profile.name?.givenName || '';
                const lastName = profile.name?.familyName || '';
                const hashedPassword = await bcrypt.hash('oauth-user', 10);

                const insertResult = await pool.query(
                    'INSERT INTO users (email, password, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [email, hashedPassword, firstName, lastName, 'job_seeker']
                );

                return done(null, insertResult.rows[0]);
            } catch (err) {
                console.error('Google strategy error:', err);
                return done(err);
            }
        }
    )
);

passport.use(
    new GitHubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails?.[0]?.value || profile.username + '@github.com';

                const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

                if (result.rows.length > 0) {
                    return done(null, result.rows[0]);
                }

                const displayName = profile.displayName || profile.username || '';
                const parts = displayName.split(' ');
                const firstName = parts[0] || profile.username || '';
                const lastName = parts[1] || '';
                const hashedPassword = await bcrypt.hash('oauth-user', 10);

                const insertResult = await pool.query(
                    'INSERT INTO users (email, password, first_name, last_name, user_type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                    [email, hashedPassword, firstName, lastName, 'job_seeker']
                );

                return done(null, insertResult.rows[0]);
            } catch (err) {
                console.error('GitHub strategy error:', err);
                return done(err);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return done(null, null);
        }
        done(null, result.rows[0]);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;