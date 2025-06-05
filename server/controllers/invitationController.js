const Invitation = require('../models/Invitation');
const Room = require('../models/Room');
const RoomParticipant = require('../models/RoomParticipant');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Send room invitation
// @route   POST /api/invitations
// @access  Private
const sendInvitation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { roomId, inviteeId } = req.body;

    // Check if room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if user is room creator
    if (!room.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only room creator can send invitations' });
    }

    // Check if invitee exists
    const invitee = await User.findById(inviteeId);
    if (!invitee) {
      return res.status(404).json({ message: 'Invitee not found' });
    }

    // Check if user is already an active participant
    const activeParticipant = await RoomParticipant.findOne({
      room: roomId,
      user: inviteeId,
      active: true
    });

    if (activeParticipant) {
      return res.status(400).json({ message: 'User is already an active participant in this room' });
    }

    // Check for pending invitations - only prevent duplicate pending invitations
    const pendingInvitation = await Invitation.findOne({
      room: roomId,
      invitee: inviteeId,
      status: 'pending'
    });

    if (pendingInvitation) {
      return res.status(400).json({ message: 'User already has a pending invitation to this room' });
    }

    // Look for existing invitation that was declined or accepted (where user left later)
    const existingInvitation = await Invitation.findOne({
      room: roomId,
      invitee: inviteeId,
      status: { $in: ['accepted', 'declined'] }
    });

    if (existingInvitation) {
      // Update the existing invitation back to pending status
      existingInvitation.status = 'pending';
      await existingInvitation.save();
      
      // Create notification for the re-invitation
      await Notification.create({
        user: inviteeId,
        type: 'invitation',
        content: `You've been invited again to join "${room.title}" by ${req.user.username}`,
        reference: existingInvitation._id,
        referenceModel: 'Invitation',
      });

      // Check if there's already a participant record
      const participantRecord = await RoomParticipant.findOne({
        room: roomId,
        user: inviteeId
      });

      if (participantRecord) {
        // Update existing participant record to inactive
        participantRecord.active = false;
        await participantRecord.save();
      } else {
        // Create new participant record as inactive
        await RoomParticipant.create({
          room: roomId,
          user: inviteeId,
          active: false,
        });
      }
      
      return res.status(200).json({ 
        message: 'Re-invitation sent successfully',
        invitation: existingInvitation
      });
    }

    // Create a new invitation if no existing one found
    const invitation = await Invitation.create({
      room: roomId,
      inviter: req.user._id,
      invitee: inviteeId,
      status: 'pending',
    });

    // Add user as inactive participant if no record exists
    const participantRecord = await RoomParticipant.findOne({
      room: roomId,
      user: inviteeId
    });

    if (!participantRecord) {
      await RoomParticipant.create({
        room: roomId,
        user: inviteeId,
        active: false,
      });
    } else if (!participantRecord.active) {
      // If there's an existing inactive record, keep it as is
      // This handles cases where the user left the room previously
    }

    // Create notification for invitee
    await Notification.create({
      user: inviteeId,
      type: 'invitation',
      content: `You've been invited to join "${room.title}" by ${req.user.username}`,
      reference: invitation._id,
      referenceModel: 'Invitation',
    });

    res.status(201).json(invitation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get invitations received by user
// @route   GET /api/invitations/received
// @access  Private
const getReceivedInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({ invitee: req.user._id })
      .populate({
        path: 'room',
        select: 'title description startTime endTime status tag',
      })
      .populate({
        path: 'inviter',
        select: 'username profile.displayName profile.avatar',
      })
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get invitations sent by user
// @route   GET /api/invitations/sent
// @access  Private
const getSentInvitations = async (req, res) => {
  try {
    const invitations = await Invitation.find({ inviter: req.user._id })
      .populate({
        path: 'room',
        select: 'title description startTime endTime status tag',
      })
      .populate({
        path: 'invitee',
        select: 'username profile.displayName profile.avatar',
      })
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get invitations for a specific room
// @route   GET /api/invitations/room/:roomId
// @access  Private
const getRoomInvitations = async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    // Check if user is room creator
    if (!room.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only room creator can view invitations' });
    }
    
    const invitations = await Invitation.find({ room: req.params.roomId })
      .populate({
        path: 'invitee',
        select: 'username profile.displayName profile.avatar',
      })
      .populate({
        path: 'inviter',
        select: 'username profile.displayName profile.avatar',
      })
      .sort({ createdAt: -1 });

    res.json(invitations);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Room not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Respond to invitation
// @route   PUT /api/invitations/:id
// @access  Private
const respondToInvitation = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status } = req.body;

    if (!['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Check if user is the invitee
    if (!invitation.invitee.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to respond to this invitation' });
    }

    // Check if invitation is still pending
    if (invitation.status !== 'pending') {
      return res.status(400).json({ message: `Invitation already ${invitation.status}` });
    }

    // Update invitation status
    invitation.status = status;
    await invitation.save();

    // If accepted, update participant record
    if (status === 'accepted') {
      const participant = await RoomParticipant.findOne({
        room: invitation.room,
        user: req.user._id,
      });

      if (participant) {
        participant.active = true;
        await participant.save();
      } else {
        // Create new participant record if it doesn't exist
        await RoomParticipant.create({
          room: invitation.room,
          user: req.user._id,
          active: true,
          joinedAt: new Date(),
        });
      }

      // Create notification for inviter
      await Notification.create({
        user: invitation.inviter,
        type: 'invitation',
        content: `${req.user.username} accepted your invitation`,
        reference: invitation.room,
        referenceModel: 'Room',
      });
    }

    res.json(invitation);
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete invitation
// @route   DELETE /api/invitations/:id
// @access  Private
const deleteInvitation = async (req, res) => {
  try {
    const invitation = await Invitation.findById(req.params.id);

    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Check if user is the inviter
    if (!invitation.inviter.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this invitation' });
    }

    await invitation.remove();

    res.json({ message: 'Invitation removed' });
  } catch (error) {
    console.error(error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  sendInvitation,
  getReceivedInvitations,
  getSentInvitations,
  getRoomInvitations,
  respondToInvitation,
  deleteInvitation,
}; 