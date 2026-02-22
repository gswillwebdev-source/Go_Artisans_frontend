require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./config/database');

async function testLoginAndProfile() {
    try {
        // Check if test user exists, if not create one
        const email = 'testworker@example.com';
        const password = 'password123';

        let userId;

        // Check user exists
        const checkRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (checkRes.rows.length === 0) {
            console.log('Creating test user...');
            const hashedPassword = await bcrypt.hash(password, 10);
            const createRes = await pool.query(
                'INSERT INTO users (email, password, first_name, last_name, phone_number) VALUES ($1, $2, $3, $4, $5) RETURNING id',
                [email, hashedPassword, 'Test', 'Worker', '+228123456789']
            );
            userId = createRes.rows[0].id;
            console.log('✅ User created:', email);
        } else {
            userId = checkRes.rows[0].id;
            console.log('✅ User exists:', email);
        }

        // Make test worker
        await pool.query(
            `UPDATE users 
             SET is_worker = true, 
                 job_title = 'Electrician',
                 location = 'Lomé',
                 bio = 'Professional electrician with 5 years experience',
                 years_experience = 5,
                 services = $1
             WHERE id = $2`,
            [JSON.stringify(['Electrical installation', 'Wiring repair', 'Panel upgrade']), userId]
        );
        console.log('✅ User updated to worker');

        // Verify profile returns correct data
        const profileRes = await pool.query(
            'SELECT id, email, first_name, last_name, phone_number, is_worker, job_title, location, bio, years_experience, services FROM users WHERE id = $1',
            [userId]
        );

        const user = profileRes.rows[0];
        console.log('\n📋 Profile Data:');
        console.log('  Email:', user.email);
        console.log('  Name:', user.first_name, user.last_name);
        console.log('  Phone:', user.phone_number);
        console.log('  Is Worker:', user.is_worker);
        console.log('  Job Title:', user.job_title);
        console.log('  Location:', user.location);
        console.log('  Bio:', user.bio);
        console.log('  Years Exp:', user.years_experience);
        console.log('  Services:', user.services);

        // Generate token
        const token = jwt.sign({ id: userId, email: user.email }, process.env.JWT_SECRET, {
            expiresIn: '24h'
        });

        console.log('\n🔐 JWT Token:');
        console.log(token);

        console.log('\n✅ Test complete! Use this token to test the frontend profile endpoint.');

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

testLoginAndProfile();
