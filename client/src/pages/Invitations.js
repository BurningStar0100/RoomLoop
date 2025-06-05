import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import { formatDateTime } from '../utils/dateUtils';
import { 
  getRoomStatusColor, 
  getRoomStatusText,
  getTagBadgeColor,
  getReadableTag 
} from '../utils/roomUtils';
import { 
  CheckIcon, 
  XMarkIcon, 
  ClockIcon,
  UserIcon,
  TagIcon
} from '@heroicons/react/24/outline';

const Invitations = () => {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);
  const navigate = useNavigate();

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      // Fetch received invitations
      const receivedRes = await api.get('/api/invitations/received');
      setReceived(receivedRes.data);

      // Fetch sent invitations
      const sentRes = await api.get('/api/invitations/sent');
      setSent(sentRes.data);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  // Handle responding to an invitation (accept/decline)
  const handleRespond = async (invitation, status) => {
    const invitationId = invitation._id;
    setRespondingId(invitationId);
    try {
      await api.put(`/api/invitations/${invitationId}`, { status });
      
      // Update local state to reflect the change
      setReceived(prevReceived => 
        prevReceived.map(inv => 
          inv._id === invitationId 
            ? { ...inv, status } 
            : inv
        )
      );
      
      if (status === 'accepted') {
        // If the user accepted, navigate to the room
        toast.success('Invitation accepted - redirecting to room...');
        
        // Get the room ID from the invitation
        const roomId = invitation.room._id;
        
        // Short delay to allow the UI to update before navigation
        setTimeout(() => {
          navigate(`/rooms/${roomId}?fromInvitation=true`);
        }, 500);
      } else {
        toast.info('Invitation declined');
      }
    } catch (error) {
      console.error(`Error ${status} invitation:`, error);
      toast.error(`Failed to ${status} invitation`);
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invitations</h1>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('received')}
              className={`${
                activeTab === 'received'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Received
            </button>
            <button
              onClick={() => setActiveTab('sent')}
              className={`${
                activeTab === 'sent'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Sent
            </button>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : activeTab === 'received' ? (
        <div className="space-y-4">
          {received.length > 0 ? (
            received.map((invitation) => (
              <div key={invitation._id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="mb-4 sm:mb-0">
                      <h3 className="text-lg font-medium text-gray-900">
                        <Link to={`/rooms/${invitation.room._id}`} className="hover:text-primary-600">
                          {invitation.room.title}
                        </Link>
                      </h3>
                      
                      <div className="mt-1 flex items-center space-x-2">
                        <span className={`${getRoomStatusColor(invitation.room.status)}`}>
                          {getRoomStatusText(invitation.room.status)}
                        </span>
                        <span className={`${getTagBadgeColor(invitation.room.tag)}`}>
                          {getReadableTag(invitation.room.tag)}
                        </span>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600">
                        {invitation.room.description}
                      </p>
                      
                      <div className="mt-3 flex flex-wrap items-center text-sm text-gray-500 gap-4">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{formatDateTime(invitation.room.startTime)}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span>
                            Invited by {invitation.inviter.profile?.displayName || invitation.inviter.username}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                      {invitation.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleRespond(invitation, 'accepted')}
                            className="btn-primary flex items-center justify-center"
                            disabled={respondingId === invitation._id}
                          >
                            {respondingId === invitation._id ? (
                              <div className="animate-spin h-4 w-4 mr-1 border-2 border-white border-t-transparent rounded-full" />
                            ) : (
                              <CheckIcon className="h-4 w-4 mr-1" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => handleRespond(invitation, 'declined')}
                            className="btn-outline flex items-center justify-center"
                            disabled={respondingId === invitation._id}
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Decline
                          </button>
                        </>
                      ) : (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          invitation.status === 'accepted' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {invitation.status === 'accepted' ? 'Accepted' : 'Declined'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                No invitations received
              </h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                You don't have any pending invitations. When someone invites you to a room, it will appear here.
              </p>
              <Link to="/dashboard/explore" className="btn-primary">
                Explore Public Rooms
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {sent.length > 0 ? (
            sent.map((invitation) => (
              <div key={invitation._id} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        <Link to={`/rooms/${invitation.room._id}`} className="hover:text-primary-600">
                          {invitation.room.title}
                        </Link>
                      </h3>
                      
                      <div className="mt-1 flex items-center space-x-2">
                        <span className={`${getRoomStatusColor(invitation.room.status)}`}>
                          {getRoomStatusText(invitation.room.status)}
                        </span>
                        <span className={`${getTagBadgeColor(invitation.room.tag)}`}>
                          {getReadableTag(invitation.room.tag)}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap items-center text-sm text-gray-500 gap-4">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span>{formatDateTime(invitation.room.startTime)}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span>
                            Invited {invitation.invitee.profile?.displayName || invitation.invitee.username}
                          </span>
                        </div>
                        
                        <div className="flex items-center mt-2 sm:mt-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            invitation.status === 'accepted' 
                              ? 'bg-green-100 text-green-800' 
                              : invitation.status === 'declined'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invitation.status === 'accepted' 
                              ? 'Accepted' 
                              : invitation.status === 'declined'
                              ? 'Declined'
                              : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                No invitations sent
              </h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                You haven't sent any invitations yet. To invite others to your rooms, visit your room details.
              </p>
              <Link to="/dashboard" className="btn-primary">
                View Your Rooms
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Invitations; 