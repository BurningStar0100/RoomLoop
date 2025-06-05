const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const {
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
} = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/rooms
// @desc    Create a new room
// @access  Private
router.post(
  '/',
  [
    protect,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('description', 'Description is required').not().isEmpty(),
      check('type', 'Type must be private or public').isIn(['private', 'public']),
      check('startTime', 'Start time is required').not().isEmpty(),
      check('endTime', 'End time is required').not().isEmpty(),
      check('tag', 'Tag is required').not().isEmpty(),
    ],
  ],
  createRoom
);

// @route   GET /api/rooms/my
// @desc    Get all rooms created by the user
// @access  Private
router.get('/my', protect, getMyRooms);

// @route   GET /api/rooms/participating
// @desc    Get rooms the user is participating in
// @access  Private
router.get('/participating', protect, getParticipatingRooms);

// @route   GET /api/rooms/public
// @desc    Get public rooms
// @access  Private
router.get('/public', protect, getPublicRooms);

// @route   GET /api/rooms/:id
// @desc    Get room by ID
// @access  Private
router.get('/:id', protect, getRoomById);

// @route   PUT /api/rooms/:id
// @desc    Update a room
// @access  Private
router.put('/:id', protect, updateRoom);

// @route   POST /api/rooms/:id/join
// @desc    Join a room
// @access  Private
router.post('/:id/join', protect, joinRoom);

// @route   POST /api/rooms/:id/leave
// @desc    Leave a room
// @access  Private
router.post('/:id/leave', protect, leaveRoom);

// @route   PUT /api/rooms/:id/extend
// @desc    Extend a room's duration
// @access  Private
router.put('/:id/extend', protect, extendRoom);

// @route   PUT /api/rooms/:id/reschedule
// @desc    Reschedule a room
// @access  Private
router.put('/:id/reschedule', protect, rescheduleRoom);

// @route   PUT /api/rooms/:id/close
// @desc    Close a room (host only)
// @access  Private
router.put('/:id/close', protect, closeRoom);

// @route   DELETE /api/rooms/:id
// @desc    Delete a room
// @access  Private
router.delete('/:id', protect, deleteRoom);

module.exports = router; 