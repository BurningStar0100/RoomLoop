const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  sendMessage,
  getRoomMessages,
  getMessagesAfterTimestamp,
  addMessageReaction,
  getMessageReactionSummary,
  updateMessageReaction,
  deleteMessageReaction
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/messages
// @desc    Send a message to a room
// @access  Private
router.post(
  '/',
  [
    protect,
    [
      check('roomId', 'Room ID is required').not().isEmpty(),
      check('content', 'Message content is required').not().isEmpty(),
      check('content', 'Message content cannot exceed 1000 characters').isLength({ max: 1000 }),
    ],
  ],
  sendMessage
);

// @route   GET /api/messages/room/:roomId
// @desc    Get messages from a room
// @access  Private
router.get('/room/:roomId', protect, getRoomMessages);

// @route   GET /api/messages/room/:roomId/after/:timestamp
// @desc    Get messages after a certain timestamp
// @access  Private
router.get('/room/:roomId/after/:timestamp', protect, getMessagesAfterTimestamp);

// @route   POST /api/messages/:messageId/reactions
// @desc    Add a reaction to a specific message
// @access  Private
router.post(
  '/:messageId/reactions',
  [
    protect,
    [
      check('emoji', 'Emoji is required').not().isEmpty(),
    ],
  ],
  addMessageReaction
);

// @route   GET /api/messages/:messageId/reactions/summary
// @desc    Get reaction summary for a specific message
// @access  Private
router.get('/:messageId/reactions/summary', protect, getMessageReactionSummary);

// @route   PUT /api/messages/:messageId/reactions/:reactionId
// @desc    Update a reaction on a specific message
// @access  Private
router.put(
  '/:messageId/reactions/:reactionId',
  [
    protect,
    [
      check('emoji', 'Emoji is required').not().isEmpty(),
    ],
  ],
  updateMessageReaction
);

// @route   DELETE /api/messages/:messageId/reactions/:reactionId
// @desc    Delete a reaction from a specific message
// @access  Private
router.delete('/:messageId/reactions/:reactionId', protect, deleteMessageReaction);

module.exports = router; 