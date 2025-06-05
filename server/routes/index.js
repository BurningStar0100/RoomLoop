const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const { io } = require('../socket');
const { createNotification } = require('../controllers/notificationController');

// @route   GET /api/debug
// @desc    Get server status and debug info
// @access  Public
router.get('/debug', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStateText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    }[dbState];
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Get MongoDB details
    const dbDetails = {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      port: mongoose.connection.port,
      models: Object.keys(mongoose.models),
    };
    
    // Check environment variables (sanitized)
    const envVars = {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      JWT_SECRET: process.env.JWT_SECRET ? '[SET]' : '[MISSING]',
      MONGODB_ATLAS_URI: process.env.MONGODB_ATLAS_URI ? 
        process.env.MONGODB_ATLAS_URI.replace(/mongodb(\+srv)?:\/\/[^:]+:([^@]+)@/, 'mongodb$1://<username>:<hidden>@') 
        : '[MISSING]',
    };
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime() + ' seconds',
      database: {
        state: dbStateText,
        details: dbDetails,
        collections: collectionNames
      },
      environment: envVars
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/debug/mongodb
// @desc    Check MongoDB connection status
// @access  Public
router.get('/debug/mongodb', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStateText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    }[dbState];
    
    // Test query to verify database access
    let collections = [];
    let roomCount = 0;
    let userCount = 0;
    
    if (dbState === 1) { // Only if connected
      // Get all collections
      collections = await mongoose.connection.db.listCollections().toArray();
      
      // Count documents in key collections
      if (mongoose.models.Room) {
        roomCount = await mongoose.models.Room.countDocuments();
      }
      
      if (mongoose.models.User) {
        userCount = await mongoose.models.User.countDocuments();
      }
    }
    
    // Get connection details
    const connDetails = {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      port: mongoose.connection.port,
    };
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        state: dbStateText,
        stateCode: dbState,
        collections: collections.map(c => c.name),
        counts: {
          rooms: roomCount,
          users: userCount
        },
        connection: connDetails
      }
    });
  } catch (error) {
    console.error('MongoDB debug endpoint error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/debug/socket
// @desc    Get Socket.io connection status
// @access  Public
router.get('/debug/socket', async (req, res) => {
  try {
    // Check if io is available
    const io = req.app.get('socketio');
    
    if (!io) {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Socket.io server not found'
      });
    }
    
    // Get connected sockets count
    const sockets = await io.fetchSockets();
    const connectedClients = sockets.length;
    
    // Get rooms with user counts
    const rooms = io.sockets.adapter.rooms;
    const roomsInfo = [];
    
    rooms.forEach((value, key) => {
      // Skip socket IDs which are also keys in the rooms Map
      if (!key.includes('-')) {
        roomsInfo.push({
          roomId: key,
          userCount: value.size
        });
      }
    });
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      socketio: {
        connectedClients,
        rooms: roomsInfo
      }
    });
  } catch (error) {
    console.error('Socket.io debug endpoint error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Debug route to test socket.io connection
router.get('/socket', protect, (req, res) => {
  const socketIo = req.app.get('socketio');
  
  if (!socketIo) {
    return res.status(500).json({ message: 'Socket.io not initialized' });
  }
  
  res.json({
    socketConnected: true,
    connectedClients: Object.keys(socketIo.sockets.connected || {}).length,
    userId: req.user._id,
    username: req.user.username
  });
});

// Debug route to test notifications
router.post('/test-notification', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const content = req.body.content || 'This is a test notification';
    
    // Create a test notification
    const notification = await createNotification(
      userId,
      'system',
      content
    );
    
    if (!notification) {
      return res.status(500).json({ message: 'Failed to create test notification' });
    }
    
    res.json({ 
      success: true, 
      message: 'Test notification created',
      notification
    });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 