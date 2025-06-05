const Message = require('../models/Message');
const Room = require('../models/Room');
const RoomParticipant = require('../models/RoomParticipant');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Send a message to a room
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { roomId, content } = req.body;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room is live
    const currentStatus = room.calculateStatus();
    if (currentStatus !== 'live') {
      return res.status(400).json({ message: 'Messages can only be sent to live rooms' });
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
      return res.status(403).json({ message: 'You must be an active participant to send messages' });
    }

    // Create and save message
    const message = await Message.create({
      room: roomId,
      user: req.user._id,
      content,
    });

    // Populate user information for immediate response
    const populatedMessage = await Message.findById(message._id).populate({
      path: 'user',
      select: 'username profile.displayName profile.avatar',
    });

    // The socket.io server will emit this message to all users in the room
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages from a room
// @route   GET /api/messages/room/:roomId
// @access  Private
const getRoomMessages = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const { limit = 100 } = req.query;

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
        return res.status(403).json({ message: 'Not authorized to access messages in this room' });
      }
    }

    // Get messages, limited by query params and sorted by time
    const messages = await Message.find({ room: roomId })
      .populate({
        path: 'user',
        select: 'username profile.displayName profile.avatar',
      })
      .populate({
        path: 'reactions.user',
        select: 'username profile.displayName profile.avatar',
      })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit));

    res.json(messages);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get messages after a certain timestamp (polling mechanism)
// @route   GET /api/messages/room/:roomId/after/:timestamp
// @access  Private
const getMessagesAfterTimestamp = async (req, res) => {
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
        return res.status(403).json({ message: 'Not authorized to access messages in this room' });
      }
    }

    // Check if room is live or closed
    const currentStatus = room.calculateStatus();
    if (currentStatus === 'scheduled') {
      return res.status(400).json({ message: 'Room has not started yet' });
    }

    // Get messages after timestamp
    const messages = await Message.find({
      room: roomId,
      createdAt: { $gt: new Date(parseInt(timestamp)) },
    })
      .populate({
        path: 'user',
        select: 'username profile.displayName profile.avatar',
      })
      .populate({
        path: 'reactions.user',
        select: 'username profile.displayName profile.avatar',
      })
      .sort({ createdAt: 1 });

    // Update room status if it's changed
    if (currentStatus !== room.status) {
      room.status = currentStatus;
      await room.save();
    }

    // Return messages and room status
    res.json({
      messages,
      roomStatus: currentStatus,
    });
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Add a reaction to a specific message
// @route   POST /api/messages/:messageId/reactions
// @access  Private
const addMessageReaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { emoji } = req.body;
    const messageId = req.params.messageId;

    // Check if message exists
    const message = await Message.findById(messageId).populate('room');
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Get the room
    const room = message.room;

    // Check if room is live
    const currentStatus = room.calculateStatus();
    if (currentStatus !== 'live') {
      return res.status(400).json({ message: 'Reactions can only be added to messages in live rooms' });
    }

    // Check if user is an active participant
    const participant = await RoomParticipant.findOne({
      room: room._id,
      user: req.user._id,
      active: true,
    });

    if (!participant) {
      return res.status(403).json({ message: 'You must be an active participant to add reactions' });
    }

    // Check if user has already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    // If user already reacted with this emoji, remove it (toggle behavior)
    if (existingReaction) {
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
      );
    } else {
      // Add the new reaction
      message.reactions.push({
        emoji,
        user: req.user._id,
        createdAt: new Date()
      });
    }

    // Save the updated message
    await message.save();

    // Return the updated message with populated user data
    const updatedMessage = await Message.findById(messageId)
      .populate({
        path: 'user',
        select: 'username profile.displayName profile.avatar',
      })
      .populate({
        path: 'reactions.user',
        select: 'username profile.displayName profile.avatar',
      });

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error('Error in addMessageReaction:', error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Message not found - Invalid ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get reaction summary for a specific message
// @route   GET /api/messages/:messageId/reactions/summary
// @access  Private
const getMessageReactionSummary = async (req, res) => {
  try {
    const messageId = req.params.messageId;

    // Check if message exists
    const message = await Message.findById(messageId).populate('room');
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Get the room
    const room = message.room;

    // Check if user has access to this room
    if (room.type === 'private' && !room.creator.equals(req.user._id)) {
      const participant = await RoomParticipant.findOne({
        room: room._id,
        user: req.user._id,
      });

      if (!participant) {
        return res.status(403).json({ message: 'Not authorized to access reactions in this room' });
      }
    }

    // Calculate reaction summary
    const reactionSummary = [];
    const emojiCounts = {};

    message.reactions.forEach(reaction => {
      if (!emojiCounts[reaction.emoji]) {
        emojiCounts[reaction.emoji] = 0;
      }
      emojiCounts[reaction.emoji]++;
    });

    // Convert to array format similar to room reactions
    Object.keys(emojiCounts).forEach(emoji => {
      reactionSummary.push({
        _id: emoji,
        count: emojiCounts[emoji]
      });
    });

    // Sort by count (descending)
    reactionSummary.sort((a, b) => b.count - a.count);

    res.json(reactionSummary);
  } catch (error) {
    console.error('Error in getMessageReactionSummary:', error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Message not found - Invalid ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a reaction on a specific message
// @route   PUT /api/messages/:messageId/reactions/:reactionId
// @access  Private
const updateMessageReaction = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { emoji } = req.body;
    const { messageId, reactionId } = req.params;

    // Check if message exists
    const message = await Message.findById(messageId).populate('room');
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Get the room
    const room = message.room;

    // Check if room is live
    const currentStatus = room.calculateStatus();
    if (currentStatus !== 'live') {
      return res.status(400).json({ message: 'Reactions can only be updated in live rooms' });
    }

    // Check if user is an active participant
    const participant = await RoomParticipant.findOne({
      room: room._id,
      user: req.user._id,
      active: true,
    });

    if (!participant) {
      return res.status(403).json({ message: 'You must be an active participant to update reactions' });
    }

    // Find the reaction to update
    const reactionIndex = message.reactions.findIndex(
      r => r._id.toString() === reactionId && r.user.toString() === req.user._id.toString()
    );

    if (reactionIndex === -1) {
      return res.status(404).json({ message: 'Reaction not found or not authorized to update it' });
    }

    // Update the reaction emoji
    message.reactions[reactionIndex].emoji = emoji;
    message.reactions[reactionIndex].updatedAt = new Date();

    // Save the updated message
    await message.save();

    // Return the updated message with populated user data
    const updatedMessage = await Message.findById(messageId)
      .populate({
        path: 'user',
        select: 'username profile.displayName profile.avatar',
      })
      .populate({
        path: 'reactions.user',
        select: 'username profile.displayName profile.avatar',
      });

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error('Error in updateMessageReaction:', error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Message or reaction not found - Invalid ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a reaction from a specific message
// @route   DELETE /api/messages/:messageId/reactions/:reactionId
// @access  Private
const deleteMessageReaction = async (req, res) => {
  try {
    const { messageId, reactionId } = req.params;

    // Check if message exists
    const message = await Message.findById(messageId).populate('room');
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Get the room
    const room = message.room;

    // Check if room is live
    const currentStatus = room.calculateStatus();
    if (currentStatus !== 'live') {
      return res.status(400).json({ message: 'Reactions can only be removed in live rooms' });
    }

    // Check if user is an active participant
    const participant = await RoomParticipant.findOne({
      room: room._id,
      user: req.user._id,
      active: true,
    });

    if (!participant) {
      return res.status(403).json({ message: 'You must be an active participant to remove reactions' });
    }

    // Find the reaction to delete
    const reactionIndex = message.reactions.findIndex(
      r => r._id.toString() === reactionId && r.user.toString() === req.user._id.toString()
    );

    if (reactionIndex === -1) {
      return res.status(404).json({ message: 'Reaction not found or not authorized to delete it' });
    }

    // Remove the reaction
    message.reactions.splice(reactionIndex, 1);

    // Save the updated message
    await message.save();

    // Return the updated message with populated user data
    const updatedMessage = await Message.findById(messageId)
      .populate({
        path: 'user',
        select: 'username profile.displayName profile.avatar',
      })
      .populate({
        path: 'reactions.user',
        select: 'username profile.displayName profile.avatar',
      });

    res.status(200).json(updatedMessage);
  } catch (error) {
    console.error('Error in deleteMessageReaction:', error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Message or reaction not found - Invalid ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getRoomMessages,
  getMessagesAfterTimestamp,
  addMessageReaction,
  getMessageReactionSummary,
  updateMessageReaction,
  deleteMessageReaction
}; 