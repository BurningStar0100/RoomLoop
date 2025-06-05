import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { formatRelativeTime } from '../utils/dateUtils';
import { 
  BellIcon, 
  CheckIcon,
  XMarkIcon,
  InformationCircleIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = async (retryCount = 0) => {
    setLoading(true);
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // Check for specific error types
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Server responded with error:', error.response.status, error.response.data);
        
        if (error.response.status === 401) {
          toast.error('Authentication error. Please log in again.');
        } else if (error.response.status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(`Failed to load notifications: ${error.response.data.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        toast.error('Network error. Please check your connection and try again.');
        
        // Attempt to retry if less than 3 retries
        if (retryCount < 2) {
          console.log(`Retrying notification fetch (${retryCount + 1}/3)...`);
          setTimeout(() => fetchNotifications(retryCount + 1), 3000);
          return;
        }
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', error.message);
        toast.error('Failed to load notifications. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Handle marking a notification as read
  const handleMarkAsRead = async (notificationId) => {
    setMarkingId(notificationId);
    try {
      await api.put(`/api/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification._id === notificationId 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    } finally {
      setMarkingId(null);
    }
  };

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    setMarkingAll(true);
    try {
      await api.put('/api/notifications/read-all');
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to update notifications');
    } finally {
      setMarkingAll(false);
    }
  };

  // Handle deleting a notification
  const handleDeleteNotification = async (notificationId) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      
      // Update local state
      const removedNotification = notifications.find(n => n._id === notificationId);
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification._id !== notificationId)
      );
      
      // Update unread count if needed
      if (removedNotification && !removedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      toast.success('Notification removed');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Get icon based on notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'invitation':
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'room_started':
        return <BellIcon className="h-5 w-5 text-green-500" />;
      case 'room_ended':
        return <BellIcon className="h-5 w-5 text-red-500" />;
      case 'message':
        return <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-purple-500" />;
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn-outline flex items-center"
            disabled={markingAll}
          >
            {markingAll ? (
              <div className="animate-spin h-4 w-4 mr-1 border-2 border-primary-500 border-t-transparent rounded-full" />
            ) : (
              <CheckIcon className="h-4 w-4 mr-1" />
            )}
            Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : notifications.length > 0 ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <li 
                key={notification._id}
                className={`p-4 hover:bg-gray-50 ${!notification.read ? 'bg-primary-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 pt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">{notification.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="text-primary-600 hover:text-primary-800"
                        disabled={markingId === notification._id}
                      >
                        {markingId === notification._id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                        ) : (
                          <CheckIcon className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {notification.reference && notification.referenceModel === 'Room' && (
                  <div className="mt-2 ml-8">
                    {notification.referenceExists === false ? (
                      <span className="text-sm text-gray-500 italic">
                        Room no longer exists
                      </span>
                    ) : (
                      <Link 
                        to={`/rooms/${typeof notification.reference === 'object' ? notification.reference._id : notification.reference}`}
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        View Room
                      </Link>
                    )}
                  </div>
                )}
                
                {notification.reference && notification.referenceModel === 'Invitation' && (
                  <div className="mt-2 ml-8">
                    {notification.referenceExists === false ? (
                      <span className="text-sm text-gray-500 italic">
                        Invitation no longer exists
                      </span>
                    ) : (
                      <Link 
                        to="/dashboard/invitations"
                        className="text-sm text-primary-600 hover:text-primary-800"
                      >
                        View Invitation
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            No notifications
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            You don't have any notifications yet. Check back later for updates on your rooms and invitations.
          </p>
          <Link to="/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      )}
    </div>
  );
};

export default Notifications; 