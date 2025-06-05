const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const jwt = require('jsonwebtoken');

// Load env vars
dotenv.config();

// Ensure environment variables are properly set
require('./config/setupEnv');

// Import after environment setup
const connectToAtlas = require('./config/atlasConfig');

// Connect to database
console.log('Starting MongoDB Atlas connection...');
connectToAtlas().then(() => {
  console.log('MongoDB Atlas connection successful, server ready to accept requests.');
}).catch(err => {
  console.error('Failed to connect to MongoDB Atlas:', err);
  process.exit(1); // Exit if database connection fails
});

const app = express();
const server = http.createServer(app);

// Determine allowed origins based on environment
const getAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    return [
      process.env.CLIENT_URL,
      // Add your Vercel deployment URL here
      'https://your-app-name.vercel.app',
      // Add any other production URLs
    ].filter(Boolean); // Remove any undefined values
  } else {
    return ['http://localhost:3000', 'http://127.0.0.1:3000'];
  }
};

// Set up Socket.io with CORS configuration
const io = socketio(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Make io available globally via a module
const socketModule = require('./socket');
socketModule.init(io);

// Make io available to routes (for debugging)
app.set('socketio', io);

// CORS middleware - must be before other middleware
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  // Production logging
  app.use(morgan('combined'));
}

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Root route for testing
app.get('/', (req, res) => {
  res.status(200).json({ 
    message: 'Chat App API Server',
    status: 'Running',
    environment: process.env.NODE_ENV
  });
});

// Socket.io authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket.io connection handler
io.on('connection', socket => {
  console.log(`Socket connected: ${socket.id} - User: ${socket.user.username}`);
  
  // Join user to their own notification room (using their user ID)
  socket.join(socket.user.id);
  console.log(`User ${socket.user.username} joined personal notification room: ${socket.user.id}`);

  // Join room
  socket.on('joinRoom', ({ roomId }) => {
    console.log(`User ${socket.user.username} joined room: ${roomId}`);
    socket.join(roomId);
  });

  // Leave room
  socket.on('leaveRoom', ({ roomId }) => {
    console.log(`User ${socket.user.username} left room: ${roomId}`);
    socket.leave(roomId);
  });

  // Listen for new messages
  socket.on('sendMessage', async ({ roomId, message }) => {
    try {
      // The message should already be saved via the API call
      // Just broadcast it to all other users in the room
      socket.to(roomId).emit('newMessage', {
        message,
        user: {
          _id: socket.user.id,
          username: socket.user.username
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Listen for reactions
  socket.on('sendReaction', ({ roomId, reaction }) => {
    try {
      // The reaction should already be saved via the API call
      // Just broadcast it to all other users in the room
      socket.to(roomId).emit('newReaction', {
        reaction,
        user: {
          _id: socket.user.id,
          username: socket.user.username
        }
      });
    } catch (error) {
      console.error('Error sending reaction:', error);
      socket.emit('error', { message: 'Failed to send reaction' });
    }
  });

  // Listen for message reactions
  socket.on('sendMessageReaction', ({ roomId, messageId, reaction }) => {
    try {
      // The message reaction should already be saved via the API call
      // Just broadcast it to all other users in the room
      socket.to(roomId).emit('newMessageReaction', {
        messageId,
        reaction,
        user: {
          _id: socket.user.id,
          username: socket.user.username
        },
        // Pass through additional flags if they exist
        removed: reaction.removed || false,
        updated: reaction.updated || false
      });
    } catch (error) {
      console.error('Error sending message reaction:', error);
      socket.emit('error', { message: 'Failed to send message reaction' });
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id} - Reason: ${reason}`);
  });

  // Handle connection errors
  socket.on('error', (error) => {
    console.error(`Socket error for ${socket.id}:`, error);
  });
});

// Make io available to our routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/debug', require('./routes/index'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/invitations', require('./routes/invitationRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/reactions', require('./routes/reactionRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
    error: isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

const PORT = process.env.PORT || 5500;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Allowed origins: ${getAllowedOrigins().join(', ')}`);
  console.log(`Socket.io server is running`);
});
