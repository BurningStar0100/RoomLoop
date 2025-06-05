const mongoose = require('mongoose');

const messageSchema = mongoose.Schema(
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
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    reactions: [
      {
        emoji: {
          type: String,
          required: true,
        },
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        }
      }
    ],
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ user: 1 });
messageSchema.index({ 'reactions.user': 1, 'reactions.emoji': 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 