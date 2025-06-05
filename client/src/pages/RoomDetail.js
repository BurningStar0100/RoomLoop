import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  formatDateTime, 
  formatTimeRange,
  formatDateWithDay,
  getTimeLeft 
} from '../utils/dateUtils';
import {
  getRoomStatusColor,
  getRoomStatusText,
  getTagBadgeColor,
  getReadableTag,
  calculateRoomStatus
} from '../utils/roomUtils';
import { 
  UsersIcon, 
  ClockIcon, 
  TagIcon, 
  UserIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  EnvelopeIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import UserSearch, { UserChip } from '../components/UserSearch';

// Custom CSS for emoji scrollbar
const emojiScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    height: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 20px;
  }
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
`;

// Prevent duplicate toast notifications
const toastIDs = {
  join: null,
  leave: null,
  reschedule: null,
  extend: null,
  close: null
};

const RoomDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { 
    socket, 
    isConnected, 
    joinRoom: socketJoinRoom, 
    leaveRoom: socketLeaveRoom,
    sendMessage: socketSendMessage,
    sendReaction: socketSendReaction,
    sendMessageReaction: socketSendMessageReaction
  } = useSocket();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isLoadingAction, setIsLoadingAction] = useState(false);
  const messagesEndRef = useRef(null);
  const [reactionSummary, setReactionSummary] = useState([]);
  const [status, setStatus] = useState('');
  const statusIntervalRef = useRef(null);
  const [showInviteUsers, setShowInviteUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [invitedUsers, setInvitedUsers] = useState([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);
  const [lastInvitationFetch, setLastInvitationFetch] = useState(Date.now());
  const [lastRoomDataFetch, setLastRoomDataFetch] = useState(Date.now());
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isExtendingTime, setIsExtendingTime] = useState(false);
  const [extensionMinutes, setExtensionMinutes] = useState(30);
  const timeWarningTimerRef = useRef(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isClosingRoom, setIsClosingRoom] = useState(false);

  const emojis = ['👍', '❤️', '😂', '😮', '😢', '👏', '🔥', '🎉'];

  // Check if user is room creator - moved up before functions that use it
  const isCreator = room?.creator?._id === user._id;

  // Fetch room data
  const fetchRoomData = useCallback(async () => {
    // Debounce room data fetching
    const now = Date.now();
    if (now - lastRoomDataFetch < 15000 && room) {
      return room; // Return existing room data
    }
    
    try {
      const res = await api.get(`/api/rooms/${roomId}`);
      setRoom(res.data);
      setParticipants(res.data.participants || []);
      setStatus(calculateRoomStatus(res.data.startTime, res.data.endTime));
      
      // Check if user is already a participant
      const isUserParticipant = res.data.participants?.some(
        p => p._id === user._id
      );
      setIsJoined(isUserParticipant);
      setLastRoomDataFetch(now);
      
      return res.data;
    } catch (err) {
      console.error('Error fetching room:', err);
      
      if (err.response?.status === 404) {
        setError('Room not found. It may have been deleted or you may have the wrong link.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to access this room.');
      } else {
        setError(err.response?.data?.message || 'Error loading room details. Please try again later.');
      }
      throw err;
    }
  }, [roomId, user._id, room, lastRoomDataFetch]);

  // Fetch room invitations
  const fetchRoomInvitations = useCallback(async () => {
    if (!room || room.creator._id !== user._id) return;

    try {
      // Only fetch invitations once per minute maximum - static data doesn't change often
      const now = Date.now();
      if (now - lastInvitationFetch < 60000) {
        return; // Skip if fetched less than a minute ago
      }
      
      const res = await api.get(`/api/invitations/room/${roomId}`);
      // We only need to exclude users who have PENDING invitations
      // Users who declined or accepted and left can be re-invited
      const pendingInvitees = res.data
        .filter(invitation => invitation.status === 'pending')
        .map(invitation => invitation.invitee._id);
      setInvitedUsers(pendingInvitees);
      setLastInvitationFetch(now);
    } catch (err) {
      console.error('Error fetching room invitations:', err);
    }
  }, [roomId, room, user._id, lastInvitationFetch]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/api/messages/room/${roomId}`);
      
      if (res.data.length > 0) {
        // Check for message reactions
        const messagesWithReactions = res.data.map(message => {
          // Ensure reactions array exists
          return {
            ...message,
            reactions: message.reactions || []
          };
        });
        
        setMessages(messagesWithReactions);
        
        // Scroll to bottom of messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, [roomId]);

  // Fetch reaction summary
  const fetchReactionSummary = useCallback(async () => {
    try {
      const res = await api.get(`/api/reactions/room/${roomId}/summary`);
      setReactionSummary(res.data);
    } catch (err) {
      console.error('Error fetching reaction summary:', err);
      // Don't display error to user to avoid disrupting chat experience
      // Just continue with empty or existing reaction summary
    }
  }, [roomId]);

  // Fetch reactions
  const fetchReactions = useCallback(async () => {
    try {
      const res = await api.get(`/api/reactions/room/${roomId}`);
      setReactions(res.data);
    } catch (err) {
      console.error('Error fetching reactions:', err);
    }
  }, [roomId]);

  // Calculate minutes remaining in the room
  const calculateMinutesRemaining = useCallback(() => {
    if (!room || !room.endTime) return 0;
    
    const endTime = new Date(room.endTime);
    const now = new Date();
    const diffMs = endTime - now;
    return Math.floor(diffMs / 60000); // Convert ms to minutes
  }, [room]);

  // Handle extending room time
  const handleExtendRoomTime = async () => {
    if (!room) return;
    
    setIsExtendingTime(true);
    try {
      const res = await api.put(`/api/rooms/${roomId}/extend`, {
        extensionMinutes
      });
      
      // Update room data with new end time
      setRoom(prevRoom => ({
        ...prevRoom,
        endTime: res.data.endTime
      }));
      
      // Hide the warning
      setShowTimeWarning(false);
      
      // Use toast ID to prevent duplicates
      if (toastIDs.extend) {
        toast.dismiss(toastIDs.extend);
      }
      toastIDs.extend = toast.success(`Room time extended by ${extensionMinutes} minutes`);
    } catch (err) {
      console.error('Error extending room time:', err);
      toast.error(err.response?.data?.message || 'Failed to extend room time');
    } finally {
      setIsExtendingTime(false);
    }
  };

  // Handle rescheduling room
  const handleRescheduleRoom = async (e) => {
    e.preventDefault();
    if (isRescheduling) return;

    try {
      setIsRescheduling(true);
      
      // Format the new dates and times
      const newStartDateTime = new Date(`${newStartDate}T${newStartTime}`);
      const newEndDateTime = new Date(`${newEndDate}T${newEndTime}`);
      
      // Validate times
      if (newEndDateTime <= newStartDateTime) {
        toast.error('End time must be after start time');
        return;
      }
      
      const response = await api.put(`/api/rooms/${roomId}/reschedule`, {
        newStartTime: newStartDateTime,
        newEndTime: newEndDateTime
      });
      
      // Update room in local state
      setRoom(prevRoom => ({
        ...prevRoom,
        startTime: newStartDateTime.toISOString(),
        endTime: newEndDateTime.toISOString(),
        status: 'scheduled',
        wasRescheduled: true
      }));
      
      // Update status
      setStatus('scheduled');
      
      // Close the modal
      setShowRescheduleModal(false);
      
      // Use toast ID to prevent duplicates
      if (toastIDs.reschedule) {
        toast.dismiss(toastIDs.reschedule);
      }
      toastIDs.reschedule = toast.success('Room rescheduled successfully');
    } catch (err) {
      console.error('Error rescheduling room:', err);
      toast.error(err.response?.data?.message || 'Failed to reschedule room');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Handle closing room
  const handleCloseRoom = async () => {
    if (!window.confirm('Are you sure you want to close this room? This action cannot be undone.')) {
      return;
    }
    
    setIsClosingRoom(true);
    try {
      const res = await api.put(`/api/rooms/${roomId}/close`);
      
      // Dismiss any previous toasts
      if (toastIDs.close) {
        toast.dismiss(toastIDs.close);
      }
      
      // Success toast
      toastIDs.close = toast.success('Room closed successfully');
      
      // Update room data
      setRoom(prevRoom => ({
        ...prevRoom,
        status: 'closed',
        endTime: new Date().toISOString() // Set end time to current time
      }));
      
      // Update status
      setStatus('closed');
    } catch (err) {
      console.error('Error closing room:', err);
      
      // Dismiss any previous toasts
      if (toastIDs.close) {
        toast.dismiss(toastIDs.close);
      }
      
      // Error toast
      toastIDs.close = toast.error(err.response?.data?.message || 'Failed to close the room');
    } finally {
      setIsClosingRoom(false);
    }
  };

  // Check if room is ending soon and show warning
  const checkRoomEnding = useCallback(() => {
    if (status === 'live' && isCreator) {
      const minutesRemaining = calculateMinutesRemaining();
      
      // Show warning when 10 minutes or less remain
      if (minutesRemaining <= 10 && minutesRemaining > 0) {
        setShowTimeWarning(true);
      } else {
        setShowTimeWarning(false);
      }
    } else {
      setShowTimeWarning(false);
    }
  }, [status, isCreator, calculateMinutesRemaining]);

  // Handle sending message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSubmittingMessage) return;
    
    try {
      setIsSubmittingMessage(true);
      
      // Send message to server via API
      const response = await api.post('/api/messages', {
        roomId,
        content: newMessage
      });
      
      // Emit the message to Socket.io for real-time updates
      socketSendMessage(roomId, response.data);
      
      // Add the message to the local state (optimistic update)
      setMessages(prevMessages => [...prevMessages, response.data]);
      
      // Clear the input field
      setNewMessage('');
      
      // Scroll to bottom of messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // Handle adding reaction to the room
  const handleAddReaction = async (emoji) => {
    try {
      // Send reaction to server via API
      const response = await api.post('/api/reactions', {
        roomId,
        emoji
      });
      
      // Emit the reaction to Socket.io for real-time updates
      socketSendReaction(roomId, response.data);
      
      // Add the reaction to the local state (optimistic update)
      setReactions(prevReactions => [...prevReactions, response.data]);
      
      // Update reaction summary
      fetchReactionSummary();
    } catch (err) {
      console.error('Error adding reaction:', err);
      toast.error(err.response?.data?.message || 'Failed to add reaction');
    }
  };

  // Handle adding reaction to a specific message
  const handleAddMessageReaction = async (messageId, emoji) => {
    try {
      // Check if user already has a reaction on this message
      const message = messages.find(msg => msg._id === messageId);
      const existingUserReaction = message?.reactions?.find(reaction => reaction.user._id === user._id);
      
      // If user clicks the same emoji they already reacted with, remove it
      if (existingUserReaction && existingUserReaction.emoji === emoji) {
        // Send request to remove reaction
        const response = await api.delete(`/api/messages/${messageId}/reactions/${existingUserReaction._id}`);
        
        // Emit the message reaction removal to Socket.io for real-time updates
        socketSendMessageReaction(roomId, messageId, {
          removed: true,
          user: { _id: user._id }
        });
      } 
      // If user already has a different reaction, replace it
      else if (existingUserReaction) {
        // Send request to update reaction
        const response = await api.put(`/api/messages/${messageId}/reactions/${existingUserReaction._id}`, {
          emoji
        });
        
        // Emit the message reaction update to Socket.io for real-time updates
        socketSendMessageReaction(roomId, messageId, {
          emoji,
          user: { _id: user._id },
          updated: true
        });
      }
      // Otherwise, add a new reaction
      else {
        // Send message reaction to server via API
        const response = await api.post(`/api/messages/${messageId}/reactions`, {
          emoji
        });
        
        // Emit the message reaction to Socket.io for real-time updates
        socketSendMessageReaction(roomId, messageId, {
          emoji,
          user: { _id: user._id }
        });
      }
      
      // Refresh messages to get updated reactions
      fetchMessages();
    } catch (err) {
      console.error('Error managing message reaction:', err);
      toast.error(err.response?.data?.message || 'Failed to manage reaction on message');
    }
  };

  // Handle joining room
  const handleJoinRoom = async () => {
    setIsLoadingAction(true);
    try {
      await api.post(`/api/rooms/${roomId}/join`);
      
      // Join the Socket.io room
      socketJoinRoom(roomId);
      
      // Use toast ID to prevent duplicates
      if (toastIDs.join) {
        toast.dismiss(toastIDs.join);
      }
      toastIDs.join = toast.success('Joined room successfully!');
      
      setIsJoined(true);
      fetchRoomData();
    } catch (err) {
      console.error('Error joining room:', err);
      toast.error(err.response?.data?.message || 'Failed to join room');
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Handle leaving room
  const handleLeaveRoom = async () => {
    setIsLoadingAction(true);
    try {
      await api.post(`/api/rooms/${roomId}/leave`);
      
      // Leave the Socket.io room
      socketLeaveRoom(roomId);
      
      // Use toast ID to prevent duplicates
      if (toastIDs.leave) {
        toast.dismiss(toastIDs.leave);
      }
      toastIDs.leave = toast.success('Left room successfully');
      
      setIsJoined(false);
      fetchRoomData();
    } catch (err) {
      console.error('Error leaving room:', err);
      toast.error(err.response?.data?.message || 'Failed to leave room');
    } finally {
      setIsLoadingAction(false);
    }
  };

  // Handle selecting a user to invite
  const handleSelectUser = (user) => {
    setSelectedUsers(prev => [...prev, user]);
  };

  // Handle removing a selected user
  const handleRemoveUser = (user) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== user._id));
  };

  // Handle sending invitations
  const handleSendInvitations = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsInviting(true);
    try {
      // Create invitations for each selected user
      await Promise.all(
        selectedUsers.map(user => 
          api.post('/api/invitations', {
            roomId,
            inviteeId: user._id
          })
        )
      );
      
      // Add users to invited users list
      const newInvitedUsers = [...invitedUsers, ...selectedUsers.map(u => u._id)];
      setInvitedUsers(newInvitedUsers);
      
      // Clear selected users
      setSelectedUsers([]);
      
      // Hide invite form
      setShowInviteUsers(false);
      
      toast.success(`Invitation${selectedUsers.length > 1 ? 's' : ''} sent successfully!`);
    } catch (err) {
      console.error('Error sending invitations:', err);
      toast.error(err.response?.data?.message || 'Failed to send invitations');
    } finally {
      setIsInviting(false);
    }
  };

  // Initialize data loading and Socket.io listeners
  useEffect(() => {
    const initializeRoom = async () => {
      setLoading(true);
      try {
        const roomData = await fetchRoomData();
        
        // Check if the room is live
        const isRoomLive = roomData.status === 'live' || calculateRoomStatus(roomData.startTime, roomData.endTime) === 'live';
        
        // If room is live, fetch messages and reactions
        if (isRoomLive) {
          await Promise.all([
            fetchMessages(),
            fetchReactions(),
            fetchReactionSummary()
          ]);
          
          // Check if we just came from accepting an invitation (using URL query param)
          const urlParams = new URLSearchParams(window.location.search);
          const fromInvitation = urlParams.get('fromInvitation') === 'true';
          
          // Automatically join the room if it's live and we came from an invitation
          if (fromInvitation && !isJoined && !isCreator) {
            console.log('Automatically joining room from invitation acceptance');
            handleJoinRoom();
          } 
          // Otherwise join the Socket.io room if already a participant
          else if (isConnected && isJoined) {
            socketJoinRoom(roomId);
          }
        }
        
        // If user is room creator, fetch invitations
        if (roomData.creator._id === user._id) {
          fetchRoomInvitations();
        }
      } catch (err) {
        // Error is already handled in fetchRoomData
      } finally {
        setLoading(false);
      }
    };

    initializeRoom();

    // Set up polling for status updates (only status updates, not full room data)
    statusIntervalRef.current = setInterval(() => {
      if (room) {
        const currentStatus = calculateRoomStatus(room.startTime, room.endTime);
        if (currentStatus !== status) {
          setStatus(currentStatus);
          
          if (currentStatus === 'live' && status !== 'live') {
            // Room just went live, start fetching messages
            fetchMessages();
            fetchReactions();
            fetchReactionSummary();
            
            // Join the Socket.io room if the user is a participant
            if (isConnected && isJoined) {
              socketJoinRoom(roomId);
            }
          } else if (currentStatus === 'closed' && status === 'live') {
            // Room just ended, leave the Socket.io room
            if (isConnected) {
              socketLeaveRoom(roomId);
            }
          }
        }
      }
    }, 30000); // Check status less frequently (30 seconds)
    
    // Set up checking for room ending soon (every minute)
    timeWarningTimerRef.current = setInterval(() => {
      checkRoomEnding();
    }, 60000); // Check every minute
    
    // Check immediately on component mount
    if (room) {
      checkRoomEnding();
    }
    
    return () => {
      // Clean up intervals
      clearInterval(statusIntervalRef.current);
      clearInterval(timeWarningTimerRef.current);
      
      // Leave the Socket.io room when component unmounts
      if (socket && isConnected) {
        socketLeaveRoom(roomId);
      }
    };
  }, [
    roomId, 
    user, 
    fetchRoomData, 
    fetchMessages, 
    fetchReactions, 
    fetchReactionSummary, 
    fetchRoomInvitations, 
    room, 
    status, 
    isConnected, 
    isJoined, 
    socketJoinRoom, 
    socketLeaveRoom, 
    socket,
    checkRoomEnding
  ]);

  // Set up Socket.io event listeners
  useEffect(() => {
    if (socket && isConnected && status === 'live' && isJoined) {
      // Listen for new messages from Socket.io
      socket.on('newMessage', (data) => {
        // Skip messages sent by the current user (already handled by optimistic updates)
        if (data.message.user._id === user._id) return;
        
        // Add the new message to the list
        setMessages(prevMessages => {
          // Check if message already exists to avoid duplicates
          if (prevMessages.some(m => m._id === data.message._id)) {
            return prevMessages;
          }
          
          const newMessages = [...prevMessages, data.message];
          
          // Scroll to bottom of messages
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          
          return newMessages;
        });
      });
      
      // Listen for new reactions from Socket.io
      socket.on('newReaction', (data) => {
        // Skip reactions sent by the current user (already handled by optimistic updates)
        if (data.user._id === user._id) return;
        
        // Add the new reaction to the list
        setReactions(prevReactions => {
          // Check if reaction already exists to avoid duplicates
          if (prevReactions.some(r => r._id === data.reaction._id)) {
            return prevReactions;
          }
          
          return [...prevReactions, data.reaction];
        });
        
        // Update reaction summary
        fetchReactionSummary();
      });
      
      // Listen for new message reactions from Socket.io
      socket.on('newMessageReaction', (data) => {
        // Skip message reactions sent by the current user (already handled by optimistic updates)
        if (data.user._id === user._id) return;
        
        // Update the message with the reaction changes
        setMessages(prevMessages => {
          return prevMessages.map(msg => {
            if (msg._id === data.messageId) {
              // Handle reaction removal
              if (data.removed) {
                return {
                  ...msg,
                  reactions: msg.reactions?.filter(
                    r => !(r.user._id === data.user._id)
                  ) || []
                };
              }
              
              // Handle reaction update (replace existing user reaction)
              if (data.updated) {
                const updatedReactions = [...(msg.reactions || [])];
                const existingIndex = updatedReactions.findIndex(
                  r => r.user._id === data.user._id
                );
                
                if (existingIndex >= 0) {
                  updatedReactions[existingIndex] = {
                    emoji: data.reaction.emoji,
                    user: data.user
                  };
                  
                  return {
                    ...msg,
                    reactions: updatedReactions
                  };
                }
              }
              
              // Handle adding new reaction
              const hasReaction = msg.reactions?.some(
                r => r.user._id === data.user._id
              );
              
              if (!hasReaction) {
                return {
                  ...msg,
                  reactions: [...(msg.reactions || []), {
                    emoji: data.reaction.emoji,
                    user: data.user
                  }]
                };
              }
            }
            return msg;
          });
        });
      });
      
      // Clean up Socket.io event listeners
      return () => {
        socket.off('newMessage');
        socket.off('newReaction');
        socket.off('newMessageReaction');
      };
    }
  }, [socket, isConnected, status, isJoined, user._id, fetchReactionSummary]);

  // Listen for room status change events (like room closure by host)
  useEffect(() => {
    const handleRoomStatusChange = (event) => {
      const { roomId: changedRoomId, status: newStatus, endTime } = event.detail;
      
      // Only update if this is the room we're currently viewing
      if (changedRoomId === roomId || changedRoomId.toString() === roomId) {
        console.log(`Room ${roomId} status changed to ${newStatus}`);
        
        // Update room data with new status and end time
        setRoom(prevRoom => ({
          ...prevRoom,
          status: newStatus,
          endTime: endTime
        }));
        
        // Update UI status
        setStatus(newStatus);
        
        // If room is closed, leave the Socket.io room
        if (newStatus === 'closed' && isConnected) {
          socketLeaveRoom(roomId);
        }
      }
    };
    
    // Add event listener for room status changes
    window.addEventListener('roomStatusChanged', handleRoomStatusChange);
    
    // Clean up
    return () => {
      window.removeEventListener('roomStatusChanged', handleRoomStatusChange);
    };
  }, [roomId, socketLeaveRoom, isConnected]);

  // Initialize date/time fields when reschedule modal opens
  useEffect(() => {
    if (showRescheduleModal && room) {
      // Use the room's current times as defaults when rescheduling
      const roomStartDate = new Date(room.startTime);
      const roomEndDate = new Date(room.endTime);
      
      // For future dates, add one day to the current date as the default
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 1);
      defaultDate.setHours(defaultDate.getHours() + 1);
      
      // Use the room date if it's in the future, otherwise use default date
      const startDate = roomStartDate > defaultDate ? roomStartDate : defaultDate;
      const endDate = roomEndDate > defaultDate ? roomEndDate : new Date(startDate.getTime() + 60 * 60 * 1000);
      
      // Format for date inputs
      setNewStartDate(startDate.toISOString().split('T')[0]);
      setNewEndDate(endDate.toISOString().split('T')[0]);
      
      // Format for time inputs (HH:MM)
      setNewStartTime(
        `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
      );
      setNewEndTime(
        `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
      );
    }
  }, [showRescheduleModal, room]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <h2 className="text-xl font-medium text-red-600 mb-2">
          {error}
        </h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 btn-outline"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <h2 className="text-xl font-medium text-gray-900 mb-2">
          Room not found
        </h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 btn-outline"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      {/* Add CSS styles for custom scrollbar */}
      <style>{emojiScrollbarStyles}</style>
      
      {/* Time Warning Alert */}
      {showTimeWarning && isCreator && (
        <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
          <div className="flex flex-col sm:flex-row">
            <div className="flex-shrink-0 mb-2 sm:mb-0">
              <ClockIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="sm:ml-3">
              <p className="text-sm text-yellow-700">
                This room will end in {calculateMinutesRemaining()} minutes. Do you want to extend the time?
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={extensionMinutes}
                  onChange={(e) => setExtensionMinutes(Number(e.target.value))}
                  className="p-1 text-sm border rounded"
                  disabled={isExtendingTime}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
                <button
                  onClick={handleExtendRoomTime}
                  className="px-3 py-1 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={isExtendingTime}
                >
                  {isExtendingTime ? 'Extending...' : 'Extend Time'}
                </button>
                <button
                  onClick={() => setShowTimeWarning(false)}
                  className="px-3 py-1 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-4 sm:space-y-0">
        <div>
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-2 text-gray-500 hover:text-gray-700 flex items-center"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900 break-words">{room.title}</h1>
          <div className="flex flex-wrap items-center mt-1 gap-2">
            <span className={`${getRoomStatusColor(status)}`}>
              {getRoomStatusText(status)}
            </span>
            <span className={`${getTagBadgeColor(room.tag)}`}>
              {getReadableTag(room.tag)}
            </span>
            {room.isRecurring && (
              <span className="bg-indigo-100 text-indigo-800 badge">
                Recurring
              </span>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* Join/Leave Button for non-creators */}
          {status === 'live' && !isCreator && (
            <div>
              {isJoined ? (
                <button
                  onClick={handleLeaveRoom}
                  className="btn-danger"
                  disabled={isLoadingAction}
                >
                  {isLoadingAction ? 'Leaving...' : 'Leave Room'}
                </button>
              ) : (
                <button
                  onClick={handleJoinRoom}
                  className="btn-primary"
                  disabled={isLoadingAction}
                >
                  {isLoadingAction ? 'Joining...' : 'Join Room'}
                </button>
              )}
            </div>
          )}
          
          {/* Room Creator Controls */}
          {isCreator && (
            <div className="flex flex-wrap gap-2">
              {status !== 'closed' && (
                <button
                  onClick={() => setShowInviteUsers(!showInviteUsers)}
                  className="btn-primary flex items-center"
                >
                  <UserPlusIcon className="h-4 w-4 mr-1" />
                  Invite
                </button>
              )}
              
              {/* Reschedule Button - show for recurring rooms or if room hasn't ended */}
              {(room?.isRecurring || status !== 'closed') && (
                <button
                  onClick={() => setShowRescheduleModal(true)}
                  className="btn-outline flex items-center"
                >
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Reschedule
                </button>
              )}
              
              {/* Close Room Button - only show if room is active */}
              {status !== 'closed' && (
                <button
                  onClick={handleCloseRoom}
                  className="btn-danger flex items-center"
                  disabled={isClosingRoom}
                >
                  {isClosingRoom ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Close
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Invite Users Form */}
      {showInviteUsers && (
        <div className="mb-6 bg-white shadow rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Invite Users</h2>
            <p className="text-sm text-gray-600 mt-1">
              {room.type === 'private' 
                ? 'Invite specific users to join your private room.' 
                : 'Even though this is a public room, you can send direct invitations to specific users.'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              You can send new invitations to users who declined previous invitations or left the room.
            </p>
          </div>
          <div className="p-4">
            <UserSearch 
              onSelectUser={handleSelectUser} 
              excludeUsers={[
                ...participants.map(p => p._id), // Only exclude active participants
                ...invitedUsers, // Only includes pending invitations now
                ...selectedUsers.map(u => u._id)
              ]}
            />
            
            {selectedUsers.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Users</h3>
                <div className="flex flex-wrap">
                  {selectedUsers.map(user => (
                    <UserChip 
                      key={user._id} 
                      user={user} 
                      onRemove={handleRemoveUser} 
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowInviteUsers(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendInvitations}
                className="btn-primary"
                disabled={selectedUsers.length === 0 || isInviting}
              >
                {isInviting ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                    Sending...
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    Send Invitations
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">About this Room</h2>
              <p className="text-gray-600 mb-6">{room.description}</p>
              
              <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-6 gap-y-3">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                  <span>{formatDateWithDay(room.startTime)}</span>
                </div>
                
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                  <span>{formatTimeRange(room.startTime, room.endTime)}</span>
                </div>
                
                {room.maxParticipants && (
                  <div className="flex items-center">
                    <UsersIcon className="h-4 w-4 mr-1 text-gray-400" />
                    <span>Max {room.maxParticipants} participants</span>
                  </div>
                )}
                
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                  <span>Created by {room.creator?.profile?.displayName || room.creator?.username}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Room Interaction Area (Messages) */}
          {status === 'live' && isJoined && (
            <div className="mt-6 bg-white shadow rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Room Chat</h2>
              </div>
              
              {/* Messages */}
              <div className="p-4 h-96 overflow-y-auto overflow-x-hidden">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map(message => {
                      const isCurrentUserMessage = message.user._id === user._id;
                      // Group reactions by emoji and count
                      const reactionsByEmoji = {};
                      if (message.reactions && message.reactions.length > 0) {
                        message.reactions.forEach(reaction => {
                          if (!reactionsByEmoji[reaction.emoji]) {
                            reactionsByEmoji[reaction.emoji] = {
                              count: 0,
                              users: []
                            };
                          }
                          reactionsByEmoji[reaction.emoji].count += 1;
                          reactionsByEmoji[reaction.emoji].users.push(reaction.user._id);
                        });
                      }
                      
                      // Get current user's reaction if any
                      const currentUserReaction = message.reactions?.find(
                        r => r.user._id === user._id
                      )?.emoji;
                      
                      return (
                        <div 
                          key={message._id} 
                          className={`flex group relative ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`relative max-w-[85%] sm:max-w-3/4 flex flex-col ${
                            isCurrentUserMessage 
                              ? 'bg-primary-100 text-primary-800' 
                              : 'bg-gray-100 text-gray-800'
                            } rounded-lg px-3 py-2 break-words`}
                          >
                            {!isCurrentUserMessage && (
                              <div className="text-xs text-gray-500 mb-1">
                                {message.user.profile?.displayName || message.user.username}
                              </div>
                            )}
                            <div className="break-words overflow-hidden">{message.content}</div>
                            
                            {/* Message Reactions */}
                            {Object.keys(reactionsByEmoji).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {Object.entries(reactionsByEmoji).map(([emoji, { count, users }]) => {
                                  const userHasThisReaction = users.includes(user._id);
                                  return (
                                    <button
                                      key={emoji}
                                      className={`${userHasThisReaction ? 'bg-primary-50' : 'bg-white bg-opacity-60'} text-xs rounded-full px-2 py-1 flex items-center`}
                                      onClick={() => handleAddMessageReaction(message._id, emoji)}
                                    >
                                      <span className="mr-1">{emoji}</span>
                                      {count > 1 && <span>{count}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            
                            {/* Emoji reaction button - positioned based on message sender */}
                            <div className={`absolute bottom-2 ${isCurrentUserMessage ? 'right-2' : 'left-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                              <div className="relative">
                                <button 
                                  className="p-1 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center bg-white shadow-sm"
                                  aria-label="Add reaction"
                                >
                                  <FaceSmileIcon className="h-4 w-4" />
                                </button>
                                
                                {/* Emoji selection panel - horizontal scrollable panel */}
                                <div 
                                  className={`absolute bottom-8 bg-white shadow-lg rounded-lg p-2 opacity-0 invisible 
                                    group-hover:opacity-100 group-hover:visible transition-opacity z-10
                                    ${isCurrentUserMessage ? 'right-0' : 'left-0'}`}
                                >
                                  <div className="flex flex-nowrap overflow-x-auto custom-scrollbar py-1 px-1" 
                                     style={{ scrollbarWidth: 'thin', minWidth: '150px', maxWidth: '300px' }}
                                  >
                                    {emojis.map(emoji => (
                                      <button
                                        key={emoji}
                                        className={`text-xl hover:bg-gray-100 p-1 rounded flex-shrink-0 ${currentUserReaction === emoji ? 'bg-gray-100' : ''}`}
                                        onClick={() => handleAddMessageReaction(message._id, emoji)}
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <form onSubmit={handleSendMessage} className="flex">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="input flex-grow mr-2"
                    disabled={isSubmittingMessage}
                  />
                  <button
                    type="submit"
                    className="btn-primary flex-shrink-0"
                    disabled={!newMessage.trim() || isSubmittingMessage}
                  >
                    {isSubmittingMessage ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <PaperAirplaneIcon className="h-5 w-5" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Room Status Information */}
          {status === 'scheduled' && (
            <div className="mt-6 bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-xl font-medium text-gray-900 mb-2">
                  This room is scheduled to start soon
                </h2>
                <p className="text-gray-600 mb-4">
                  {getTimeLeft(room.startTime) 
                    ? `Starting in ${getTimeLeft(room.startTime)}` 
                    : `Starting at ${formatDateTime(room.startTime)}`}
                </p>
                {room.type === 'public' && (
                  <p className="text-sm text-gray-500">
                    You'll be able to join once the room goes live.
                  </p>
                )}
              </div>
            </div>
          )}

          {status === 'closed' && (
            <div className="mt-6 bg-white shadow rounded-lg p-6">
              <div className="text-center">
                <h2 className="text-xl font-medium text-gray-900 mb-2">
                  This room has ended
                </h2>
                <p className="text-gray-600">
                  The room was active from {formatDateTime(room.startTime)} to {formatDateTime(room.endTime)}
                </p>
                {room.summary && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Room Summary</h3>
                    <p className="text-gray-600">{room.summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Participants and Reactions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Participants */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Participants</h2>
            </div>
            <div className="p-4">
              {participants.length === 0 ? (
                <div className="text-center text-gray-500 py-2">
                  No participants yet
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {participants.map(participant => (
                    <li key={participant._id} className="py-3 flex items-center">
                      {participant.profile?.avatar ? (
                        <img
                          src={participant.profile.avatar}
                          alt={participant.username}
                          className="h-8 w-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                      <span className="text-gray-800">
                        {participant.profile?.displayName || participant.username}
                      </span>
                      {participant._id === room.creator._id && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-800 px-2 py-1 rounded-full">
                          Host
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Reactions */}
          {status === 'live' && isJoined && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Room Reactions</h2>
              </div>
              <div className="p-4">
                {/* Reaction summary */}
                {reactionSummary.length > 0 ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {reactionSummary.map(reaction => (
                      <div 
                        key={reaction._id} 
                        className="bg-gray-100 rounded-full px-3 py-1 text-sm flex items-center"
                      >
                        <span className="text-xl mr-1">{reaction._id}</span>
                        <span className="text-gray-600">{reaction.count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-2 mb-4">
                    No reactions yet
                  </div>
                )}

                {/* Recent reactions */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Recent</h3>
                  <div className="flex flex-wrap gap-2">
                    {reactions.slice(-8).map(reaction => (
                      <div key={reaction._id} className="animate-pulse-slow">
                        <span className="text-2xl">{reaction.emoji}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add reaction */}
                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Add Room Reaction</h3>
                  <div className="flex flex-wrap gap-2">
                    {emojis.map(emoji => (
                      <button
                        key={emoji}
                        className="text-2xl hover:bg-gray-100 p-1 rounded"
                        onClick={() => handleAddReaction(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-medium text-gray-900 mb-4">Reschedule Room</h2>
            
            <form onSubmit={handleRescheduleRoom}>
              <div className="mb-4">
                <label htmlFor="newStartDate" className="block text-sm font-medium text-gray-700">
                  New Start Date
                </label>
                <input
                  type="date"
                  id="newStartDate"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="newStartTime" className="block text-sm font-medium text-gray-700">
                  New Start Time
                </label>
                <input
                  type="time"
                  id="newStartTime"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="newEndDate" className="block text-sm font-medium text-gray-700">
                  New End Date
                </label>
                <input
                  type="date"
                  id="newEndDate"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="newEndTime" className="block text-sm font-medium text-gray-700">
                  New End Time
                </label>
                <input
                  type="time"
                  id="newEndTime"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="btn-outline"
                  disabled={isRescheduling}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isRescheduling}
                >
                  {isRescheduling ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                      Rescheduling...
                    </>
                  ) : (
                    'Reschedule Room'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomDetail; 