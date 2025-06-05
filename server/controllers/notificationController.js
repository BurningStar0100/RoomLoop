const Notification = require('../models/Notification');
const { validationResult } = require('express-validator');
const { io } = require('../socket');
const mongoose = require('mongoose');

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const { limit = 20, skip = 0, read } = req.query;
    
    // Build query
    const query = { user: req.user._id };
    
    // Filter by read status if provided
    if (read !== undefined) {
      query.read = read === 'true';
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    // Prepare populated notifications with safer reference handling
    const populatedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        try {
          // Return the notification as is if it doesn't have a reference
          if (!notification.reference || !notification.referenceModel) {
            return notification;
          }

          // Validate if the reference exists
          if (!mongoose.Types.ObjectId.isValid(notification.reference)) {
            console.warn(`Invalid ObjectId format for notification reference: ${notification.reference}`);
            // Return notification with the reference field but mark invalid
            return {
              ...notification.toObject(),
              reference: notification.reference,
              referenceExists: false
            };
          }

          // Load the appropriate model based on referenceModel
          let Model;
          try {
            Model = mongoose.model(notification.referenceModel);
          } catch (err) {
            console.error(`Model not found for reference: ${notification.referenceModel}`);
            return notification;
          }

          // Check if referenced document exists
          const referenceDoc = await Model.findById(notification.reference);
          
          if (!referenceDoc) {
            console.warn(`Referenced document no longer exists: ${notification.referenceModel} ${notification.reference}`);
            // Return notification with the reference field but mark as non-existent
            return {
              ...notification.toObject(),
              reference: notification.reference,
              referenceExists: false
            };
          }

          // Populate reference with relevant fields
          let populatedDoc;
          if (notification.referenceModel === 'Room') {
            populatedDoc = {
              ...notification.toObject(),
              reference: {
                _id: referenceDoc._id,
                title: referenceDoc.title,
                description: referenceDoc.description,
                startTime: referenceDoc.startTime,
                endTime: referenceDoc.endTime,
                status: referenceDoc.status
              },
              referenceExists: true
            };
          } else if (notification.referenceModel === 'Invitation') {
            populatedDoc = {
              ...notification.toObject(),
              reference: {
                _id: referenceDoc._id,
                status: referenceDoc.status,
                room: referenceDoc.room
              },
              referenceExists: true
            };
          } else {
            // Generic population for other models
            populatedDoc = {
              ...notification.toObject(),
              reference: referenceDoc,
              referenceExists: true
            };
          }
          
          return populatedDoc;
        } catch (err) {
          console.error(`Error processing notification ${notification._id}:`, err);
          // Return the original notification if population fails
          return notification;
        }
      })
    );

    // Get total unread count
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.json({
      notifications: populatedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error in getUserNotifications:', error);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if notification belongs to user
    if (!notification.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update notification
    notification.read = true;
    await notification.save();

    // Emit socket event for real-time updates
    io.to(req.user._id.toString()).emit('notificationRead', { 
      id: notification._id 
    });

    res.json(notification);
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(500).json({ message: 'Server error while marking notification as read' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsAsRead = async (req, res) => {
  try {
    // Update all unread notifications for this user
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    // Emit socket event for real-time updates
    io.to(req.user._id.toString()).emit('notificationRead', { all: true });

    res.json({
      message: 'All notifications marked as read',
      count: result.modifiedCount || result.nModified // Support both MongoDB driver versions
    });
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
    res.status(500).json({ message: 'Server error while marking all notifications as read' });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Check if notification belongs to user
    if (!notification.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Use deleteOne instead of deprecated remove method
    await Notification.deleteOne({ _id: notification._id });

    res.json({ message: 'Notification removed' });
  } catch (error) {
    console.error('Error in deleteNotification:', error);
    
    // Check if error is because of invalid ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(500).json({ message: 'Server error while deleting notification' });
  }
};

// @desc    Create a notification (internal use only)
// @access  Internal
const createNotification = async (userId, type, content, reference = null, referenceModel = null) => {
  try {
    const notificationData = {
      user: userId,
      type,
      content,
      read: false,
    };

    if (reference && referenceModel) {
      notificationData.reference = reference;
      notificationData.referenceModel = referenceModel;
    }

    const notification = await Notification.create(notificationData);
    
    // Emit socket event for real-time updates
    console.log(`Emitting newNotification event to user ${userId}:`, {
      _id: notification._id,
      type: notification.type, 
      content: notification.content
    });
    
    io.to(userId.toString()).emit('newNotification', {
      _id: notification._id,
      type: notification.type,
      content: notification.content
    });
    
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
}; 