const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['invitation', 'room_started', 'room_ended', 'message', 'system', 'room_update'],
    },
    content: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    reference: {
      // Could be a room ID, invitation ID, etc.
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      enum: ['Room', 'Invitation', 'Message'],
      required: function() {
        return this.reference != null;
      }
    }
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 