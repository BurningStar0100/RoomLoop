import { format, formatDistance, formatRelative, parseISO } from 'date-fns';

// Format date to readable string (May 10, 2023)
export const formatDate = (dateString) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMMM d, yyyy');
  } catch (error) {
    return 'Invalid date';
  }
};

// Format time (2:30 PM)
export const formatTime = (dateString) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'h:mm a');
  } catch (error) {
    return 'Invalid time';
  }
};

// Format date and time (May 10, 2023 at 2:30 PM)
export const formatDateTime = (dateString) => {
  try {
    const date = parseISO(dateString);
    return format(date, "MMMM d, yyyy 'at' h:mm a");
  } catch (error) {
    return 'Invalid date';
  }
};

// Format relative time (e.g., "2 hours ago", "in 3 days")
export const formatRelativeTime = (dateString) => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    return formatDistance(date, now, { addSuffix: true });
  } catch (error) {
    return 'Invalid date';
  }
};

// Format day and month (May 10)
export const formatDayMonth = (dateString) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d');
  } catch (error) {
    return 'Invalid date';
  }
};

// Format time range (2:30 PM - 4:30 PM)
export const formatTimeRange = (startDateString, endDateString) => {
  try {
    const startDate = parseISO(startDateString);
    const endDate = parseISO(endDateString);
    return `${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  } catch (error) {
    return 'Invalid time range';
  }
};

// Format date with day of week (Monday, May 10)
export const formatDateWithDay = (dateString) => {
  try {
    const date = parseISO(dateString);
    return format(date, 'EEEE, MMMM d');
  } catch (error) {
    return 'Invalid date';
  }
};

// Get time left until date (e.g., "2 hours", "3 days")
export const getTimeLeft = (dateString) => {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    
    if (date <= now) {
      return null;
    }
    
    return formatDistance(date, now);
  } catch (error) {
    return null;
  }
}; 