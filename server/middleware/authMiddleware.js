const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
  let token;

  // Log request for debugging
  console.log(`Auth middleware called for ${req.method} ${req.originalUrl}`);

  // Check if token exists in headers
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!token || token === 'null' || token === 'undefined') {
        console.error('Invalid token format received');
        return res.status(401).json({ message: 'Not authorized, invalid token format' });
      }

      // Verify token
      if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not defined in environment variables');
        return res.status(500).json({ message: 'Server configuration error' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(`Token verified for user ID: ${decoded.id}`);

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        console.error(`User not found for ID: ${decoded.id}`);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      console.log(`User authenticated: ${req.user.username} (${req.user._id})`);
      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      
      // Provide specific error messages based on the type of error
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token' });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired' });
      }
      
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    console.error('No token provided in request headers');
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect }; 