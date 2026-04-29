const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Lazy-init Supabase admin client (avoids crash if env vars not loaded yet at module load time)
let _supabaseAdmin = null;
function getSupabaseAdmin() {
    if (!_supabaseAdmin && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
    }
    return _supabaseAdmin;
}

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // 1. Try Supabase JWT first (used by the Next.js frontend via supabase.auth.getSession())
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
        try {
            const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
            if (!error && user) {
                req.user = { id: user.id, email: user.email };
                return next();
            }
        } catch (_) { /* fall through to custom JWT */ }
    }

    // 2. Fall back to custom JWT (legacy backend-issued tokens)
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
};

module.exports = { authenticateToken };
