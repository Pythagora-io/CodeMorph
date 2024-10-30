const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('../utils/encryption');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  openaiKey: {
    type: String,
    set: encrypt,
    get: decrypt
  },
  githubKey: {
    type: String,
    set: encrypt,
    get: decrypt
  },
  repositories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Repository' }]
});

userSchema.pre('save', function(next) {
  const user = this;
  if (!user.isModified('password')) return next();
  bcrypt.hash(user.password, 10, (err, hash) => {
    if (err) {
      console.error('Error hashing password:', err);
      console.error(err.stack);
      return next(err);
    }
    user.password = hash;
    next();
  });
});

userSchema.set('toJSON', { getters: true });
userSchema.set('toObject', { getters: true });

module.exports = mongoose.model('User', userSchema);