const mongoose = require('mongoose');

const roomSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    type: {
      type: String,
      required: true,
      enum: ['private', 'public'],
      default: 'private',
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    maxParticipants: {
      type: Number,
      default: null,
    },
    tag: {
      type: String,
      required: true,
      enum: ['hangout', 'work', 'brainstorm', 'wellness', 'social', 'focus', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      required: true,
      enum: ['scheduled', 'live', 'closed'],
      default: 'scheduled',
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    summary: {
      type: String,
      default: '',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', null],
      default: null,
    },
    originalStartTime: {
      type: Date,
      default: null,
    },
    originalEndTime: {
      type: Date,
      default: null,
    },
    wasRescheduled: {
      type: Boolean,
      default: false,
    },
    parentRoomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for better query performance
roomSchema.index({ status: 1 });
roomSchema.index({ tag: 1 });
roomSchema.index({ startTime: 1 });
roomSchema.index({ creator: 1 });
roomSchema.index({ type: 1 });
roomSchema.index({ isRecurring: 1 });
roomSchema.index({ parentRoomId: 1 });

// Virtual for checking if room is currently live
roomSchema.virtual('isLive').get(function() {
  const now = new Date();
  return now >= this.startTime && now <= this.endTime;
});

// Method to calculate current status based on time
roomSchema.methods.calculateStatus = function() {
  const now = new Date();
  
  if (now < this.startTime) {
    return 'scheduled';
  } else if (now >= this.startTime && now <= this.endTime) {
    return 'live';
  } else {
    return 'closed';
  }
};

const Room = mongoose.model('Room', roomSchema);

module.exports = Room; 