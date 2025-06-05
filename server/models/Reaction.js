const mongoose = require('mongoose');

const reactionSchema = mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
reactionSchema.index({ room: 1, createdAt: -1 });
reactionSchema.index({ user: 1 });

const Reaction = mongoose.model('Reaction', reactionSchema);

module.exports = Reaction; 