const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // Fair-usage quota against Scriptly's shared Gemini key.
    // Resets automatically the first time a user makes a request on a new UTC day —
    // no cron job needed, the check happens inline on each request.
    generationsToday: { type: Number, default: 0 },
    quotaDate: { type: String, default: '' }, // 'YYYY-MM-DD', the day generationsToday applies to
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
