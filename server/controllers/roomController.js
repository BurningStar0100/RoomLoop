const Room = require('../models/Room');
const RoomParticipant = require('../models/RoomParticipant');
const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Private
const createRoom = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      title,
      description,
      type,
      startTime,
      endTime,
      maxParticipants,
      tag,
      isRecurring,
      recurrencePattern,
    } = req.body;

    // Validate time window
    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (start < now) {
      return res.status(400).json({ message: 'Start time must be in the future' });
    }

    if (end <= start) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Create room
    const room = await Room.create({
      title,
      description,
      type,
      startTime: start,
      endTime: end,
      maxParticipants: maxParticipants || null,
      tag,
      status: 'scheduled',
      creator: req.user._id,
      isRecurring: isRecurring || false,
      recurrencePattern: isRecurring ? recurrencePattern : null,
    });

    // Add creator as participant
    await RoomParticipant.create({
      room: room._id,
      user: req.user._id,
      joinedAt: now,
      active: true,
    });

    res.status(201).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all rooms created by the user
// @route   GET /api/rooms/my
// @access  Private
const getMyRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ creator: req.user._id })
      .sort({ startTime: -1 })
      .populate('creator', 'username profile.displayName profile.avatar');

    // Update room statuses based on current time
    const updatedRooms = rooms.map(room => {
      const status = room.calculateStatus();
      if (status !== room.status) {
        // Update room status in DB if it's changed
        room.status = status;
        room.save();
      }
      return room;
    });

    res.json(updatedRooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get rooms the user is participating in
// @route   GET /api/rooms/participating
// @access  Private
const getParticipatingRooms = async (req, res) => {
  try {
    // Find all rooms where user is a participant
    const participants = await RoomParticipant.find({ user: req.user._id });
    const roomIds = participants.map(p => p.room);

    // Get rooms that user didn't create but is participating in
    const rooms = await Room.find({
      _id: { $in: roomIds },
      creator: { $ne: req.user._id }
    })
      .sort({ startTime: -1 })
      .populate('creator', 'username profile.displayName profile.avatar');

    // Update room statuses based on current time
    const updatedRooms = rooms.map(room => {
      const status = room.calculateStatus();
      if (status !== room.status) {
        // Update room status in DB if it's changed
        room.status = status;
        room.save();
      }
      return room;
    });

    res.json(updatedRooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get public rooms
// @route   GET /api/rooms/public
// @access  Private
const getPublicRooms = async (req, res) => {
  try {
    const { status, tag } = req.query;
    const now = new Date();
    
    // Base query - public rooms that aren't closed and haven't ended
    const query = {
      type: 'public',
      endTime: { $gte: now },
    };
    
    // Add status filter if provided
    if (status && ['scheduled', 'live'].includes(status)) {
      query.status = status;
    }
    
    // Add tag filter if provided
    if (tag) {
      query.tag = tag;
    }

    const rooms = await Room.find(query)
      .sort({ startTime: 1 })
      .populate('creator', 'username profile.displayName profile.avatar');

    // Update room statuses based on current time
    const updatedRooms = await Promise.all(rooms.map(async room => {
      const currentStatus = room.calculateStatus();
      
      if (currentStatus !== room.status) {
        room.status = currentStatus;
        await room.save();
      }
      
      return room;
    }));

    res.json(updatedRooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get details of a specific room
// @route   GET /api/rooms/:id
// @access  Private
const getRoomById = async (req, res) => {
  try {
    // Validate object ID format first
    const ObjectId = mongoose.Types.ObjectId;
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Room not found - Invalid ID format' });
    }
    
    const room = await Room.findById(req.params.id)
      .populate('creator', 'username profile.displayName profile.avatar');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user has access to this room
    if (room.type === 'private' && !room.creator.equals(req.user._id)) {
      // Check if user is a participant
      const participant = await RoomParticipant.findOne({
        room: room._id,
        user: req.user._id,
      });

      if (!participant) {
        return res.status(403).json({ message: 'Not authorized to access this room' });
      }
    }

    // Get participants
    const participants = await RoomParticipant.find({ room: room._id, active: true })
      .populate('user', 'username profile.displayName profile.avatar')
      .select('-room');

    // Update room status if needed
    const currentStatus = room.calculateStatus();
    if (currentStatus !== room.status) {
      room.status = currentStatus;
      await room.save();
    }

    res.json({
      ...room.toObject(),
      participants: participants.map(p => p.user),
    });
  } catch (error) {
    console.error('Error in getRoomById:', error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found - Invalid ID' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Private
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room belongs to user
    if (!room.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to update this room' });
    }

    // Check if room is already closed
    if (room.status === 'closed') {
      return res.status(400).json({ message: 'Cannot update a closed room' });
    }

    // Update fields
    const { title, description, tag, maxParticipants, summary } = req.body;

    if (title) room.title = title;
    if (description) room.description = description;
    if (tag) room.tag = tag;
    if (maxParticipants !== undefined) room.maxParticipants = maxParticipants;
    if (summary) room.summary = summary;

    // For time changes, validate that room hasn't started yet
    if (req.body.startTime || req.body.endTime) {
      const now = new Date();
      
      if (room.status === 'live' || room.startTime < now) {
        return res.status(400).json({ message: 'Cannot change time for a room that has already started' });
      }
      
      const startTime = req.body.startTime ? new Date(req.body.startTime) : room.startTime;
      const endTime = req.body.endTime ? new Date(req.body.endTime) : room.endTime;
      
      if (startTime >= endTime) {
        return res.status(400).json({ message: 'End time must be after start time' });
      }
      
      if (startTime < now) {
        return res.status(400).json({ message: 'Start time must be in the future' });
      }
      
      room.startTime = startTime;
      room.endTime = endTime;
    }

    const updatedRoom = await room.save();

    res.json(updatedRoom);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Join a room
// @route   POST /api/rooms/:id/join
// @access  Private
const joinRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room is live
    const currentStatus = room.calculateStatus();
    
    if (currentStatus !== 'live') {
      return res.status(400).json({ 
        message: currentStatus === 'scheduled' ? 
          'This room has not started yet' : 
          'This room has already ended' 
      });
    }

    // Update room status if it's different in the database
    if (room.status !== currentStatus) {
      room.status = currentStatus;
      await room.save();
    }

    // Check if private room
    if (room.type === 'private' && !room.creator.equals(req.user._id)) {
      // Check if user is invited
      const participant = await RoomParticipant.findOne({
        room: room._id,
        user: req.user._id,
      });

      if (!participant) {
        return res.status(403).json({ message: 'Not authorized to join this room' });
      }
    }

    // Check maximum participants
    if (room.maxParticipants) {
      const activeParticipantsCount = await RoomParticipant.countDocuments({
        room: room._id,
        active: true,
      });

      if (activeParticipantsCount >= room.maxParticipants) {
        return res.status(400).json({ message: 'Room is full' });
      }
    }

    // Check if already a participant
    let participant = await RoomParticipant.findOne({
      room: room._id,
      user: req.user._id,
    });

    if (participant) {
      // If previously left, reactivate
      if (!participant.active) {
        participant.active = true;
        participant.joinedAt = new Date();
        participant.leftAt = null;
        await participant.save();
      }
    } else {
      // Create new participant
      participant = await RoomParticipant.create({
        room: room._id,
        user: req.user._id,
        joinedAt: new Date(),
        active: true,
      });
    }

    res.status(200).json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Leave a room
// @route   POST /api/rooms/:id/leave
// @access  Private
const leaveRoom = async (req, res) => {
  try {
    // Check if user is a participant
    const participant = await RoomParticipant.findOne({
      room: req.params.id,
      user: req.user._id,
      active: true,
    });

    if (!participant) {
      return res.status(400).json({ message: 'Not currently in this room' });
    }

    // Update participant status
    participant.active = false;
    participant.leftAt = new Date();
    await participant.save();

    res.status(200).json({ message: 'Left room successfully' });
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check ownership
    if (!room.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Room.findByIdAndDelete(req.params.id);
    res.json({ message: 'Room removed' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Extend a room's duration
// @route   PUT /api/rooms/:id/extend
// @access  Private
const extendRoom = async (req, res) => {
  try {
    const { extensionMinutes } = req.body;
    
    // Validate extension time
    if (!extensionMinutes || extensionMinutes <= 0 || extensionMinutes > 240) {
      return res.status(400).json({ 
        message: 'Extension time must be between 1 and 240 minutes' 
      });
    }
    
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check ownership - only creator can extend room time
    if (!room.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to extend this room' });
    }
    
    // Check if room is in progress (live)
    if (room.status !== 'live') {
      return res.status(400).json({ 
        message: 'Only live rooms can be extended' 
      });
    }
    
    // Calculate new end time
    const currentEndTime = new Date(room.endTime);
    const newEndTime = new Date(currentEndTime.getTime() + extensionMinutes * 60000);
    
    // Update the room with new end time
    room.endTime = newEndTime;
    await room.save();
    
    res.json({
      message: `Room time extended by ${extensionMinutes} minutes`,
      endTime: room.endTime
    });
  } catch (error) {
    console.error('Error extending room time:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Reschedule a recurring room
// @route   PUT /api/rooms/:id/reschedule
// @access  Private
const rescheduleRoom = async (req, res) => {
  try {
    const { newStartTime, newEndTime } = req.body;
    
    // Validate new times
    if (!newStartTime || !newEndTime) {
      return res.status(400).json({ 
        message: 'Both new start time and end time are required' 
      });
    }
    
    const newStart = new Date(newStartTime);
    const newEnd = new Date(newEndTime);
    const now = new Date();
    
    if (newStart < now) {
      return res.status(400).json({ message: 'New start time must be in the future' });
    }
    
    if (newEnd <= newStart) {
      return res.status(400).json({ message: 'New end time must be after new start time' });
    }
    
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check ownership - only creator can reschedule
    if (!room.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to reschedule this room' });
    }
    
    // Check if room is a recurring room or can be rescheduled
    if (!room.isRecurring && room.status === 'closed') {
      return res.status(400).json({ 
        message: 'Only recurring rooms or scheduled/live rooms can be rescheduled' 
      });
    }
    
    // If this is first reschedule, store original times
    if (!room.wasRescheduled) {
      room.originalStartTime = room.startTime;
      room.originalEndTime = room.endTime;
    }
    
    // Update the room with new times
    room.startTime = newStart;
    room.endTime = newEnd;
    room.wasRescheduled = true;
    
    // If room was already closed, set back to scheduled
    if (room.status === 'closed') {
      room.status = 'scheduled';
    }
    
    await room.save();
    
    // Create notification for all participants
    const participants = await RoomParticipant.find({
      room: room._id
    });
    
    // Notify all participants except the creator
    const participantNotifications = participants
      .filter(p => !p.user.equals(req.user._id))
      .map(p => {
        return Notification.create({
          user: p.user,
          type: 'room_update',
          content: `Room "${room.title}" has been rescheduled to ${new Date(newStartTime).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          }).replace(',', '')}.`,
          reference: room._id,
          referenceModel: 'Room',
        });
      });
    
    await Promise.all(participantNotifications);
    
    res.json({
      message: 'Room rescheduled successfully',
      room
    });
  } catch (error) {
    console.error('Error rescheduling room:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Close a room (host only)
// @route   PUT /api/rooms/:id/close
// @access  Private
const closeRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check ownership - only creator can close the room
    if (!room.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to close this room' });
    }
    
    // Update the room status to closed and set endTime to current time
    const now = new Date();
    room.status = 'closed';
    room.endTime = now;
    await room.save();
    
    // Emit room closed event to all users in the room via Socket.io
    req.io.to(req.params.id).emit('roomStatusChange', {
      roomId: room._id,
      status: 'closed',
      endTime: now
    });
    
    // Notify all participants that the room has been closed
    const participants = await RoomParticipant.find({ 
      room: room._id,
      active: true,
      user: { $ne: req.user._id } // Don't notify the creator
    }).populate('user');
    
    // Create notifications for all active participants
    const participantNotifications = participants.map(p => {
      return Notification.create({
        user: p.user._id,
        type: 'room_update',
        content: `Room "${room.title}" has been closed by the host.`,
        reference: room._id,
        referenceModel: 'Room',
      });
    });
    
    // Wait for all notifications to be created
    if (participantNotifications.length > 0) {
      await Promise.all(participantNotifications);
    }
    
    res.status(200).json({ 
      message: 'Room closed successfully',
      room
    });
  } catch (error) {
    console.error('Error closing room:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createRoom,
  getMyRooms,
  getParticipatingRooms,
  getPublicRooms,
  getRoomById,
  updateRoom,
  joinRoom,
  leaveRoom,
  deleteRoom,
  extendRoom,
  rescheduleRoom,
  closeRoom,
}; 