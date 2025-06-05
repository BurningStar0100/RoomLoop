const mongoose = require('mongoose');

const roomParticipantSchema = mongoose.Schema(
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
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create unique compound index to prevent duplicate entries
roomParticipantSchema.index({ room: 1, user: 1 }, { unique: true });

// Create indexes for better query performance
roomParticipantSchema.index({ room: 1, active: 1 });
roomParticipantSchema.index({ user: 1 });

const RoomParticipant = mongoose.model('RoomParticipant', roomParticipantSchema);

module.exports = RoomParticipant; 