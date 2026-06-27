const User = require('../models/User');

// Default daily cap per user against Scriptly's shared Gemini key.
// Override with DAILY_QUOTA in .env without touching code.
const DAILY_QUOTA = parseInt(process.env.DAILY_QUOTA, 10) || 10;

function todayKey() {
  // UTC date string, e.g. '2026-06-27' — simple, unambiguous, no timezone drift.
  return new Date().toISOString().slice(0, 10);
}

// Runs after authMiddleware (needs req.userId). Checks and *reserves* one
// generation slot before the Gemini call is made, so a user can't fire
// several requests in parallel and slip past the cap.
async function checkQuota(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ message: 'Log in to use the console.' });
    }

    const today = todayKey();
    if (user.quotaDate !== today) {
      // First request of a new day — reset the counter.
      user.quotaDate = today;
      user.generationsToday = 0;
    }

    if (user.generationsToday >= DAILY_QUOTA) {
      return res.status(429).json({
        message: `You've used today's ${DAILY_QUOTA} free generations. Quota resets at midnight UTC.`,
        quota: { used: user.generationsToday, limit: DAILY_QUOTA },
      });
    }

    user.generationsToday += 1;
    await user.save();

    req.quota = { used: user.generationsToday, limit: DAILY_QUOTA, remaining: DAILY_QUOTA - user.generationsToday };
    next();
  } catch (err) {
    res.status(500).json({ message: 'Could not verify your usage quota.', detail: err.message });
  }
}

module.exports = checkQuota;
