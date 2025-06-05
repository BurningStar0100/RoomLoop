const mongoose = require('mongoose');
const Reaction = require('../models/Reaction');
const Room = require('../models/Room');
const RoomParticipant = require('../models/RoomParticipant');
const { validationResult } = require('express-validator');

// @desc    Add a reaction to a room
// @route   POST /api/reactions
// @access  Private
const addReaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { roomId, emoji } = req.body;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room is live
    const currentStatus = room.calculateStatus();
    if (currentStatus !== 'live') {
      return res.status(400).json({ message: 'Reactions can only be added to live rooms' });
    }

    // Update room status if needed
    if (room.status !== currentStatus) {
      room.status = currentStatus;
      await room.save();
    }

    // Check if user is an active participant
    const participant = await RoomParticipant.findOne({
      room: roomId,
      user: req.user._id,
      active: true,
    });

    if (!participant) {
      return res.status(403).json({ message: 'You must be an active participant to add reactions' });
    }

    // Create and save reaction
    const reaction = await Reaction.create({
      room: roomId,
      user: req.user._id,
      emoji,
    });

    // Populate user information for immediate response
    const populatedReaction = await Reaction.findById(reaction._id).populate({
      path: 'user',
      select: 'username profile.displayName profile.avatar',
    });

    // The socket.io server will emit this reaction to all users in the room
    res.status(201).json(populatedReaction);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get reactions from a room
// @route   GET /api/reactions/room/:roomId
// @access  Private
const getRoomReactions = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const { limit = 50, before = Date.now() } = req.query;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user has access to this room
    if (room.type === 'private' && !room.creator.equals(req.user._id)) {
      const participant = await RoomParticipant.findOne({
        room: roomId,
        user: req.user._id,
      });

      if (!participant) {
        return res.status(403).json({ message: 'Not authorized to access reactions in this room' });
      }
    }

    // Get reactions, limited by query params and sorted by time
    const reactions = await Reaction.find({
      room: roomId,
      createdAt: { $lt: new Date(before) },
    })
      .populate({
        path: 'user',
        select: 'username profile.displayName profile.avatar',
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(reactions);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get reactions after a certain timestamp (polling mechanism)
// @route   GET /api/reactions/room/:roomId/after/:timestamp
// @access  Private
const getReactionsAfterTimestamp = async (req, res) => {
  try {
    const { roomId, timestamp } = req.params;
    
    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user has access to this room
    if (room.type === 'private' && !room.creator.equals(req.user._id)) {
      const participant = await RoomParticipant.findOne({
        room: roomId,
        user: req.user._id,
      });

      if (!participant) {
        return res.status(403).json({ message: 'Not authorized to access reactions in this room' });
      }
    }

    // Check if room is live or closed
    const currentStatus = room.calculateStatus();
    if (currentStatus === 'scheduled') {
      return res.status(400).json({ message: 'Room has not started yet' });
    }

    // Get reactions after timestamp
    const reactions = await Reaction.find({
      room: roomId,
      createdAt: { $gt: new Date(parseInt(timestamp)) },
    })
      .populate({
        path: 'user',
        select: 'username profile.displayName profile.avatar',
      })
      .sort({ createdAt: 1 });

    res.json(reactions);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get reaction summary (counts by emoji)
// @route   GET /api/reactions/room/:roomId/summary
// @access  Private
const getRoomReactionSummary = async (req, res) => {
  try {
    const roomId = req.params.roomId;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user has access to this room
    if (room.type === 'private' && !room.creator.equals(req.user._id)) {
      const participant = await RoomParticipant.findOne({
        room: roomId,
        user: req.user._id,
      });

      if (!participant) {
        return res.status(403).json({ message: 'Not authorized to access reactions in this room' });
      }
    }

    // Get reaction counts grouped by emoji
    const reactionSummary = await Reaction.aggregate([
      { $match: { room: new mongoose.Types.ObjectId(roomId) } },
      { $group: { _id: '$emoji', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json(reactionSummary);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  addReaction,
  getRoomReactions,
  getReactionsAfterTimestamp,
  getRoomReactionSummary,
}; 