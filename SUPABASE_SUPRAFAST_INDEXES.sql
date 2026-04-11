-- These will now use indexes (Bitmap Scan / Index Scan):
EXPLAIN ANALYZE SELECT * FROM users WHERE user_type = 'worker' AND is_active = true ORDER BY created_at DESC LIMIT 10;

EXPLAIN ANALYZE SELECT * FROM jobs WHERE status = 'active' AND category = 'plumbing' ORDER BY created_at DESC;

EXPLAIN ANALYZE SELECT * FROM applications WHERE job_id = 'xxx' AND status = 'pending';

EXPLAIN ANALYZE SELECT * FROM users WHERE first_name ILIKE '%john%';