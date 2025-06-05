const mongoose = require('mongoose');

const invitationSchema = mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    inviter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invitee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Create index for faster lookups, but not unique to allow re-invitations
invitationSchema.index({ room: 1, invitee: 1 });

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = Invitation; 