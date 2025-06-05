const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  sendInvitation,
  getReceivedInvitations,
  getSentInvitations,
  getRoomInvitations,
  respondToInvitation,
  deleteInvitation,
} = require('../controllers/invitationController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/invitations
// @desc    Send room invitation
// @access  Private
router.post(
  '/',
  [
    protect,
    [
      check('roomId', 'Room ID is required').not().isEmpty(),
      check('inviteeId', 'Invitee ID is required').not().isEmpty(),
    ],
  ],
  sendInvitation
);

// @route   GET /api/invitations/received
// @desc    Get invitations received by user
// @access  Private
router.get('/received', protect, getReceivedInvitations);

// @route   GET /api/invitations/sent
// @desc    Get invitations sent by user
// @access  Private
router.get('/sent', protect, getSentInvitations);

// @route   GET /api/invitations/room/:roomId
// @desc    Get invitations for a specific room
// @access  Private
router.get('/room/:roomId', protect, getRoomInvitations);

// @route   PUT /api/invitations/:id
// @desc    Respond to invitation
// @access  Private
router.put(
  '/:id',
  [
    protect,
    [
      check('status', 'Status is required').not().isEmpty(),
      check('status', 'Status must be accepted or declined').isIn(['accepted', 'declined']),
    ],
  ],
  respondToInvitation
);

// @route   DELETE /api/invitations/:id
// @desc    Delete invitation
// @access  Private
router.delete('/:id', protect, deleteInvitation);

module.exports = router; 