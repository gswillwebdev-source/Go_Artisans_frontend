const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        match: /.+\@.+\..+/
    },
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    googleId: String,
    githubId: String,
    resetCode: String,
    resetCodeExpiry: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
})

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

// Compare password method
userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password)
}

module.exports = mongoose.model('User', userSchema)