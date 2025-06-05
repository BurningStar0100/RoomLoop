import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import {
  BellIcon,
  UserIcon,
  EnvelopeIcon,
  PlusIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const MainLayout = ({ hideNav = false }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Function to fetch unread notifications count
  const fetchUnreadCount = useCallback(async () => {
    try {
      console.log('Manually refreshing notification count');
      const res = await api.get('/api/notifications?read=false&limit=1');
      const count = res.data.unreadCount;
      console.log('API returned unread count:', count);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  // Function to fetch pending invitations count
  const fetchPendingInvitationsCount = useCallback(async () => {
    try {
      console.log('Fetching pending invitations count');
      const res = await api.get('/api/invitations/received');
      const pendingCount = res.data.filter(inv => inv.status === 'pending').length;
      console.log('Pending invitations count:', pendingCount);
      setPendingInvitationsCount(pendingCount);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, []);

  // Fetch counts on mount
  useEffect(() => {
    fetchUnreadCount();
    fetchPendingInvitationsCount();
  }, [fetchUnreadCount, fetchPendingInvitationsCount]);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('Socket not connected, cannot set up notification listeners');
      return;
    }

    console.log('Setting up notification listeners with socket:', socket.id);
    
    // Handler for receiving new notifications
    const handleNewNotification = (data) => {
      console.log('Received new notification:', data);
      // Increment unread count
      setUnreadCount(prevCount => {
        const newCount = prevCount + 1;
        console.log('Updated unread count:', newCount);
        return newCount;
      });
      
      // If notification is an invitation, also update the invitation count
      if (data.type === 'invitation') {
        setPendingInvitationsCount(prevCount => prevCount + 1);
      }
    };
    
    // Handler for notifications being marked as read
    const handleNotificationRead = (data) => {
      console.log('Notification read event:', data);
      if (data.all) {
        // All notifications marked as read
        setUnreadCount(0);
        console.log('All notifications marked as read. Count reset to 0');
      } else {
        // Single notification marked as read
        setUnreadCount(prevCount => {
          const newCount = Math.max(0, prevCount - 1);
          console.log('Updated unread count after marking as read:', newCount);
          return newCount;
        });
      }
    };
    
    // Listen for notification events
    socket.on('newNotification', handleNewNotification);
    socket.on('notificationRead', handleNotificationRead);
    
    console.log('Socket event listeners for notifications set up');
    
    // Clean up event listeners
    return () => {
      console.log('Cleaning up notification listeners');
      socket.off('newNotification', handleNewNotification);
      socket.off('notificationRead', handleNotificationRead);
      console.log('Socket event listeners for notifications cleaned up');
    };
  }, [socket, isConnected]);

  // Listen for socket reconnection and refresh counts
  useEffect(() => {
    if (!socket) return;
    
    const handleReconnect = () => {
      console.log('Socket reconnected, refreshing notification count');
      fetchUnreadCount();
      fetchPendingInvitationsCount();
    };
    
    socket.on('reconnect', handleReconnect);
    
    return () => {
      socket.off('reconnect', handleReconnect);
    };
  }, [socket, fetchUnreadCount, fetchPendingInvitationsCount]);

  // Close mobile menu when location changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Refresh counts when returning to the app or switching tabs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount();
        fetchPendingInvitationsCount();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnreadCount, fetchPendingInvitationsCount]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {!hideNav && (
        <nav className="bg-white shadow w-full">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/dashboard" className="flex-shrink-0 flex items-center">
                  <h1 className="text-xl sm:text-2xl font-bold text-primary-600">RoomLoop</h1>
                </Link>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                  <Link
                    to="/dashboard"
                    className={`${
                      location.pathname === '/dashboard'
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/dashboard/explore"
                    className={`${
                      location.pathname === '/dashboard/explore'
                        ? 'border-primary-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    Explore
                  </Link>
                </div>
              </div>
              <div className="flex items-center">
                <div className="hidden sm:flex sm:items-center">
                <Link
                  to="/dashboard/create-room"
                    className="inline-flex items-center px-2 sm:px-3 py-1.5 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 mr-2"
                >
                    <PlusIcon className="h-4 w-4 mr-0 sm:mr-1" />
                  <span className="hidden sm:inline">New Room</span>
                  </Link>
                  <div className="relative flex space-x-3 sm:space-x-4">
                    <div className="relative">
                      <Link to="/dashboard/invitations" className="text-gray-500 hover:text-gray-700 relative">
                        <EnvelopeIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        {pendingInvitationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">
                            {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                          </span>
                        )}
                      </Link>
                    </div>
                    <div className="relative">
                  <Link to="/dashboard/notifications" className="text-gray-500 hover:text-gray-700 relative">
                        <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                    </div>
                  <div className="relative">
                    <div className="flex items-center relative">
                      <Link
                        to="/dashboard/profile"
                        className="text-gray-500 hover:text-gray-700 flex items-center"
                      >
                        {user?.profile?.avatar ? (
                          <img
                            src={user.profile.avatar}
                            alt={user.username}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-primary-600" />
                          </div>
                        )}
                          <span className="ml-2 hidden sm:block text-sm truncate max-w-[100px]">
                          {user?.profile?.displayName || user?.username}
                        </span>
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                      className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 whitespace-nowrap"
                    >
                      Logout
                    </button>
                  </div>
                </div>
                
                {/* Mobile menu button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMobileMenuOpen ? (
                    <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                  ) : (
                    <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile menu, show/hide based on menu state */}
          {isMobileMenuOpen && (
            <div className="sm:hidden">
              <div className="pt-2 pb-3 space-y-1 border-t border-gray-200">
                <Link
                  to="/dashboard"
                  className={`${
                    location.pathname === '/dashboard'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/dashboard/explore"
                  className={`${
                    location.pathname === '/dashboard/explore'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                >
                  Explore
                </Link>
                <Link
                  to="/dashboard/create-room"
                  className="border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                >
                  <div className="flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2 text-primary-600" />
                    Create New Room
                  </div>
                </Link>
                <Link
                  to="/dashboard/invitations"
                  className={`${
                    location.pathname === '/dashboard/invitations'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                >
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-5 w-5 mr-2" />
                    Invitations
                    {pendingInvitationsCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                        {pendingInvitationsCount > 9 ? '9+' : pendingInvitationsCount}
                      </span>
                    )}
                  </div>
                </Link>
                <Link
                  to="/dashboard/notifications"
                  className={`${
                    location.pathname === '/dashboard/notifications'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                >
                  <div className="flex items-center">
                    <BellIcon className="h-5 w-5 mr-2" />
                    Notifications
                    {unreadCount > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
                <Link
                  to="/dashboard/profile"
                  className={`${
                    location.pathname === '/dashboard/profile'
                      ? 'bg-primary-50 border-primary-500 text-primary-700'
                      : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                  } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
                >
                  <div className="flex items-center">
                    <UserIcon className="h-5 w-5 mr-2" />
                    Profile
                  </div>
                </Link>
              </div>
              <div className="pt-4 pb-3 border-t border-gray-200">
                <div className="flex items-center px-4">
                  {user?.profile?.avatar ? (
                    <img
                      src={user.profile.avatar}
                      alt={user.username}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-primary-600" />
                    </div>
                  )}
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800">
                      {user?.profile?.displayName || user?.username}
                    </div>
                    <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </nav>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-6">
        <Outlet />
      </div>

      {/* Mobile bottom navigation - only show when mobile menu is closed */}
      {!hideNav && !isMobileMenuOpen && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-2 z-10">
          <div className="flex justify-around items-center">
            <Link
              to="/dashboard"
              className={`${
                location.pathname === '/dashboard' ? 'text-primary-600' : 'text-gray-500'
              } flex flex-col items-center text-xs`}
            >
              <HomeIcon className="h-5 w-5 mb-1" />
              <span>Home</span>
            </Link>
            <Link
              to="/dashboard/explore"
              className={`${
                location.pathname === '/dashboard/explore' ? 'text-primary-600' : 'text-gray-500'
              } flex flex-col items-center text-xs`}
            >
              <MagnifyingGlassIcon className="h-5 w-5 mb-1" />
              <span>Explore</span>
            </Link>
            <Link
              to="/dashboard/create-room"
              className="flex flex-col items-center text-xs text-primary-600"
            >
              <div className="bg-primary-600 rounded-full p-1.5 mb-1">
                <PlusIcon className="h-4 w-4 text-white" />
              </div>
              <span>Create</span>
            </Link>
            <Link
              to="/dashboard/notifications"
              className={`${
                location.pathname === '/dashboard/notifications' ? 'text-primary-600' : 'text-gray-500'
              } flex flex-col items-center text-xs relative`}
            >
              <div className="relative mb-1">
                <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-3.5 w-3.5 flex items-center justify-center">
                    {unreadCount > 9 ? '9' : unreadCount}
                </span>
              )}
              </div>
              <span>Alerts</span>
            </Link>
            <Link
              to="/dashboard/profile"
              className={`${
                location.pathname === '/dashboard/profile' ? 'text-primary-600' : 'text-gray-500'
              } flex flex-col items-center text-xs`}
            >
              <UserIcon className="h-5 w-5 mb-1" />
              <span>Profile</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout; 