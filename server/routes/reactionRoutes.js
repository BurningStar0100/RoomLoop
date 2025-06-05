const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
  addReaction,
  getRoomReactions,
  getReactionsAfterTimestamp,
  getRoomReactionSummary,
} = require('../controllers/reactionController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/reactions
// @desc    Add a reaction to a room
// @access  Private
router.post(
  '/',
  [
    protect,
    [
      check('roomId', 'Room ID is required').not().isEmpty(),
      check('emoji', 'Emoji is required').not().isEmpty(),
    ],
  ],
  addReaction
);

// @route   GET /api/reactions/room/:roomId
// @desc    Get reactions from a room
// @access  Private
router.get('/room/:roomId', protect, getRoomReactions);

// @route   GET /api/reactions/room/:roomId/after/:timestamp
// @desc    Get reactions after a certain timestamp
// @access  Private
router.get('/room/:roomId/after/:timestamp', protect, getReactionsAfterTimestamp);

// @route   GET /api/reactions/room/:roomId/summary
// @desc    Get reaction summary for a room
// @access  Private
router.get('/room/:roomId/summary', protect, getRoomReactionSummary);

module.exports = router; 