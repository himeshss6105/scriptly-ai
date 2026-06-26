const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type:     { type: String, default: 'script' },
    tone:     { type: String, default: 'Balanced' },
    length:   { type: String, default: 'Medium' },
    platform: { type: String, default: '' },
    prompt:   { type: String, required: true },
    output:   { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Content', contentSchema);
