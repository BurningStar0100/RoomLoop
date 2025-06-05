import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { UserIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const UserSearch = ({ onSelectUser, excludeUsers = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      try {
        const res = await api.get(`/api/users/search?q=${searchTerm}`);
        // Filter out excluded users
        const filteredResults = res.data.filter(
          (user) => !excludeUsers.includes(user._id)
        );
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Error searching users:', error);
        toast.error('Failed to search users');
      } finally {
        setLoading(false);
      }
    };

    // Debounce search
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchUsers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, excludeUsers]);

  // Handle selecting a user
  const handleSelectUser = (user) => {
    onSelectUser(user);
    setSearchTerm('');
    setSearchResults([]);
    setShowResults(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={searchRef}>
      <div className="flex rounded-md shadow-sm">
        <div className="relative flex-grow focus-within:z-10">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setShowResults(true)}
            placeholder="Search by username or email"
            className="input pl-10"
          />
        </div>
      </div>

      {/* Results dropdown */}
      {showResults && (searchResults.length > 0 || loading) && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-sm text-gray-500">Searching...</span>
            </div>
          ) : (
            searchResults.map((user) => (
              <div
                key={user._id}
                className="cursor-pointer hover:bg-gray-100 px-4 py-2"
                onClick={() => handleSelectUser(user)}
              >
                <div className="flex items-center">
                  {user.profile?.avatar ? (
                    <img
                      src={user.profile.avatar}
                      alt={user.username}
                      className="h-8 w-8 rounded-full mr-3"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.profile?.displayName || user.username}
                    </p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// User chip component for selected users
export const UserChip = ({ user, onRemove }) => {
  return (
    <div className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-sm mr-2 mb-2">
      {user.profile?.avatar ? (
        <img
          src={user.profile.avatar}
          alt={user.username}
          className="h-5 w-5 rounded-full mr-1"
        />
      ) : (
        <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center mr-1">
          <UserIcon className="h-3 w-3 text-gray-500" />
        </div>
      )}
      <span className="text-gray-900 mr-1">
        {user.profile?.displayName || user.username}
      </span>
      <button
        type="button"
        onClick={() => onRemove(user)}
        className="text-gray-500 hover:text-gray-700"
      >
        <XMarkIcon className="h-3 w-3" />
      </button>
    </div>
  );
};

export default UserSearch; 