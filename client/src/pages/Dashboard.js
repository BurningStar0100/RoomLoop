import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import RoomCard from '../components/RoomCard';
import { toast } from 'react-toastify';
import { PlusIcon, ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const [myRooms, setMyRooms] = useState([]);
  const [participatingRooms, setParticipatingRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('created');

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Fetch rooms created by the user
      const createdRes = await api.get('/api/rooms/my');
      setMyRooms(createdRes.data);

      // Fetch rooms the user is participating in
      const participatingRes = await api.get('/api/rooms/participating');
      setParticipatingRooms(participatingRes.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleRefresh = () => {
    fetchRooms();
    toast.success('Rooms refreshed');
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Rooms</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleRefresh}
            className="btn-outline flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link to="/dashboard/create-room" className="btn-primary">
            <PlusIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">New Room</span>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('created')}
              className={`${
                activeTab === 'created'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Created by me
            </button>
            <button
              onClick={() => setActiveTab('participating')}
              className={`${
                activeTab === 'participating'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Participating
            </button>
          </nav>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : activeTab === 'created' ? (
        <div className="space-y-4">
          {myRooms.length > 0 ? (
            myRooms.map((room) => <RoomCard key={room._id} room={room} showCreator={false} />)
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                You haven't created any rooms yet
              </h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Create your first room to start connecting with others. It only takes a minute!
              </p>
              <Link to="/dashboard/create-room" className="btn-primary">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Room
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {participatingRooms.length > 0 ? (
            participatingRooms.map((room) => <RoomCard key={room._id} room={room} />)
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <h2 className="text-xl font-medium text-gray-900 mb-2">
                You're not participating in any rooms yet
              </h2>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                Check out the explore page to find public rooms to join, or wait for invitations
                from other users.
              </p>
              <Link to="/dashboard/explore" className="btn-primary">
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Explore Rooms
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 