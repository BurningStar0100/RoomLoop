import { parseISO } from 'date-fns';

// Calculate room status based on time
export const calculateRoomStatus = (startTime, endTime) => {
  const now = new Date();
  const start = parseISO(startTime);
  const end = parseISO(endTime);

  if (now < start) {
    return 'scheduled';
  } else if (now >= start && now <= end) {
    return 'live';
  } else {
    return 'closed';
  }
};

// Get color class for room status badge
export const getRoomStatusColor = (status) => {
  switch (status) {
    case 'scheduled':
      return 'badge-yellow';
    case 'live':
      return 'badge-green';
    case 'closed':
      return 'badge-gray';
    default:
      return 'badge-gray';
  }
};

// Get text for room status
export const getRoomStatusText = (status) => {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'live':
      return 'Live';
    case 'closed':
      return 'Closed';
    default:
      return 'Unknown';
  }
};

// Get background color for room card based on tag
export const getRoomTagColor = (tag) => {
  switch (tag) {
    case 'hangout':
      return 'bg-blue-50 border-blue-200';
    case 'work':
      return 'bg-gray-50 border-gray-200';
    case 'brainstorm':
      return 'bg-purple-50 border-purple-200';
    case 'wellness':
      return 'bg-green-50 border-green-200';
    case 'social':
      return 'bg-pink-50 border-pink-200';
    case 'focus':
      return 'bg-indigo-50 border-indigo-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
};

// Get badge color for room tag
export const getTagBadgeColor = (tag) => {
  switch (tag) {
    case 'hangout':
      return 'badge-blue';
    case 'work':
      return 'badge-gray';
    case 'brainstorm':
      return 'badge-purple';
    case 'wellness':
      return 'badge-green';
    case 'social':
      return 'badge-pink bg-pink-100 text-pink-800';
    case 'focus':
      return 'badge-indigo bg-indigo-100 text-indigo-800';
    default:
      return 'badge-gray';
  }
};

// Get readable tag name with capitalization
export const getReadableTag = (tag) => {
  if (!tag) return '';
  return tag.charAt(0).toUpperCase() + tag.slice(1);
};

// Get human-readable recurrence pattern
export const getRecurrenceText = (pattern) => {
  switch (pattern) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Bi-weekly';
    case 'monthly':
      return 'Monthly';
    default:
      return '';
  }
};

// Get recurrence badge color
export const getRecurrenceBadgeColor = (isRecurring) => {
  return isRecurring ? 'bg-indigo-100 text-indigo-800' : '';
}; 