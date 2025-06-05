import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, token } = useContext(AuthContext);
  
  useEffect(() => {
    let socketInstance = null;
    
    // Only connect to Socket.io if the user is authenticated
    if (user && token) {
      // Get the API URL from environment or use default
      const apiUrl = process.env.REACT_APP_API_URL || '';
      console.log('Connecting to Socket.io server at:', apiUrl);
      
      // Create Socket instance
      socketInstance = io(apiUrl, {
        auth: { token },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      
      // Socket connection event listeners
      socketInstance.on('connect', () => {
        console.log('Socket.io connected!');
        setIsConnected(true);
      });
      
      socketInstance.on('disconnect', () => {
        console.log('Socket.io disconnected!');
        setIsConnected(false);
      });
      
      socketInstance.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error.message);
        setIsConnected(false);
      });
      
      // Listen for notification events
      socketInstance.on('newNotification', (data) => {
        console.log('SocketContext received new notification:', data);
        
        // Don't show toast for room actions that already have API toasts
        // This prevents duplicate notifications for join/leave/reschedule actions
        if (data.type === 'room_update' || data.content.includes('joined') || 
            data.content.includes('left') || data.content.includes('rescheduled')) {
          return;
        }
        
        // Show a toast notification for other types of notifications
        toast.info(data.content || 'You have a new notification');
      });
      
      // Listen for room status changes
      socketInstance.on('roomStatusChange', (data) => {
        console.log('SocketContext received room status change:', data);
        
        // Emit a custom event that components can listen for
        const event = new CustomEvent('roomStatusChanged', { 
          detail: data 
        });
        window.dispatchEvent(event);
        
        // Show toast notification for room closure
        if (data.status === 'closed') {
          toast.info('This room has been closed by the host');
        }
      });
      
      // Set the socket instance
      setSocket(socketInstance);
    }
    
    // Cleanup function
    return () => {
      if (socketInstance) {
        console.log('Disconnecting Socket.io');
        socketInstance.disconnect();
      }
    };
  }, [user, token]);
  
  // Join a room
  const joinRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('joinRoom', { roomId });
    }
  };
  
  // Leave a room
  const leaveRoom = (roomId) => {
    if (socket && isConnected) {
      socket.emit('leaveRoom', { roomId });
    }
  };
  
  // Send a message
  const sendMessage = (roomId, message) => {
    if (socket && isConnected) {
      socket.emit('sendMessage', { roomId, message });
    }
  };
  
  // Send a room reaction
  const sendReaction = (roomId, reaction) => {
    if (socket && isConnected) {
      socket.emit('sendReaction', { roomId, reaction });
    }
  };
  
  // Send a message reaction
  const sendMessageReaction = (roomId, messageId, reaction) => {
    if (socket && isConnected) {
      socket.emit('sendMessageReaction', { roomId, messageId, reaction });
    }
  };
  
  const contextValue = {
    socket,
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    sendReaction,
    sendMessageReaction
  };
  
  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext; 