import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import RoomCard from '../components/RoomCard';
import { ArrowPathIcon, FunnelIcon } from '@heroicons/react/24/outline';

const ExploreRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    tag: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Create query params
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.tag) queryParams.append('tag', filters.tag);

      const res = await api.get(`/api/rooms/public?${queryParams.toString()}`);
      setRooms(res.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [filters]);

  const handleRefresh = () => {
    fetchRooms();
    toast.success('Rooms refreshed');
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      tag: '',
    });
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Explore Rooms</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-outline flex items-center"
          >
            <FunnelIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            onClick={handleRefresh}
            className="btn-outline flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="input"
                value={filters.status}
                onChange={handleFilterChange}
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
              </select>
            </div>
            <div>
              <label htmlFor="tag" className="label">
                Tag
              </label>
              <select
                id="tag"
                name="tag"
                className="input"
                value={filters.tag}
                onChange={handleFilterChange}
              >
                <option value="">All Tags</option>
                <option value="hangout">Hangout</option>
                <option value="work">Work</option>
                <option value="brainstorm">Brainstorm</option>
                <option value="wellness">Wellness</option>
                <option value="social">Social</option>
                <option value="focus">Focus</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="btn-outline h-10"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      ) : rooms.length > 0 ? (
        <div className="space-y-4">
          {rooms.map((room) => (
            <RoomCard key={room._id} room={room} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <h2 className="text-xl font-medium text-gray-900 mb-2">
            No public rooms found
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            {filters.status || filters.tag
              ? "Try adjusting your filters to see more rooms"
              : "There are no public rooms available at the moment. Check back later or try creating your own!"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExploreRooms; 