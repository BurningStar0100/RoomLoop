const User = require('../models/User');
const { generateToken } = require('../utils/tokenUtils');
const { validationResult } = require('express-validator');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });

    if (userExists) {
      if (userExists.email === email) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      if (userExists.username === username) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      profile: {
        displayName: username,
      },
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        profile: user.profile,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { login, password } = req.body;

  try {
    // Check if user exists (allow login with email or username)
    const user = await User.findOne({
      $or: [{ email: login }, { username: login }],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user data with token
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profile: user.profile,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      // Update only fields that were sent in the request
      if (req.body.username) {
        // Check if username is already taken
        const usernameExists = await User.findOne({ 
          username: req.body.username,
          _id: { $ne: req.user._id } 
        });
        
        if (usernameExists) {
          return res.status(400).json({ message: 'Username already taken' });
        }
        
        user.username = req.body.username;
      }
      
      if (req.body.email) {
        // Check if email is already in use
        const emailExists = await User.findOne({ 
          email: req.body.email,
          _id: { $ne: req.user._id }
        });
        
        if (emailExists) {
          return res.status(400).json({ message: 'Email already in use' });
        }
        
        user.email = req.body.email;
      }
      
      if (req.body.password) {
        user.password = req.body.password;
      }
      
      // Update profile fields
      if (req.body.profile) {
        user.profile = {
          ...user.profile,
          ...req.body.profile,
        };
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        profile: updatedUser.profile,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
}; 