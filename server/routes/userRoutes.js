const express = require('express');
const router = express.Router();
const { searchUsers, getUserById } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/users/search
// @desc    Search users by username or email
// @access  Private
router.get('/search', protect, searchUsers);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', protect, getUserById);

module.exports = router; 