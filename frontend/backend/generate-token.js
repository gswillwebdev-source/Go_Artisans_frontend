require('dotenv').config();
const jwt = require('jsonwebtoken');

// Create a token for user ID 1
const token = jwt.sign({ id: 1, email: 'test@example.com' }, process.env.JWT_SECRET, {
    expiresIn: '24h'
});

console.log('Generated JWT Token:');
console.log(token);
