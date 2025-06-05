import React from 'react';
import { Link } from 'react-router-dom';
import {
  ClockIcon,
  UsersIcon,
  TagIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import {
  formatTimeRange,
  formatDateWithDay,
  getTimeLeft,
} from '../utils/dateUtils';
import {
  getRoomStatusColor,
  getRoomStatusText,
  getRoomTagColor,
  getTagBadgeColor,
  getReadableTag,
  calculateRoomStatus,
} from '../utils/roomUtils';

const RoomCard = ({ room, showCreator = true }) => {
  const currentStatus = calculateRoomStatus(room.startTime, room.endTime);
  const timeLeft = currentStatus === 'scheduled' ? getTimeLeft(room.startTime) : null;
  
  return (
    <div className={`card border-l-4 ${getRoomTagColor(room.tag)} hover:shadow-md transition-shadow`}>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
          <h3 className="text-lg font-medium text-gray-900">
            <Link to={`/rooms/${room._id}`} className="hover:text-primary-600">
              {room.title}
            </Link>
          </h3>
          <span className={`${getRoomStatusColor(currentStatus)} mt-1 sm:mt-0 sm:ml-2 self-start`}>
            {getRoomStatusText(currentStatus)}
          </span>
        </div>
        
        <p className="mt-1 text-sm text-gray-600 line-clamp-2 mb-3">
          {room.description}
        </p>
        
        <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-2">
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
              <span>Max {room.maxParticipants}</span>
            </div>
          )}
          
          <div className="flex items-center">
            <TagIcon className="h-4 w-4 mr-1 text-gray-400" />
            <span className={`${getTagBadgeColor(room.tag)} text-xs py-0.5 px-2 rounded-full`}>
              {getReadableTag(room.tag)}
            </span>
          </div>
        </div>
        
        {timeLeft && (
          <div className="mt-2 text-xs font-medium text-primary-600">
            Starts in {timeLeft}
          </div>
        )}
        
        {showCreator && room.creator && (
          <div className="mt-3 flex items-center text-sm text-gray-500">
            <div className="flex-shrink-0">
              {room.creator.profile?.avatar ? (
                <img
                  src={room.creator.profile.avatar}
                  alt={room.creator.username}
                  className="h-6 w-6 rounded-full"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-3 w-3 text-gray-500" />
                </div>
              )}
            </div>
            <div className="ml-2">
              Created by{' '}
              <span className="font-medium text-gray-700">
                {room.creator.profile?.displayName || room.creator.username}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomCard; 