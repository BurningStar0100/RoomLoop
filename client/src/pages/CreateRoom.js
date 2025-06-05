import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import api from '../services/api';

const CreateRoom = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState('weekly');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const roomType = watch('type', 'private');

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Convert dates to ISO strings
      const formattedData = {
        ...data,
        startTime: new Date(data.startDate + 'T' + data.startTime).toISOString(),
        endTime: new Date(data.endDate + 'T' + data.endTime).toISOString(),
        isRecurring,
        recurrencePattern: isRecurring ? recurrencePattern : null
      };

      // Remove temporary fields
      delete formattedData.startDate;
      delete formattedData.endDate;

      const response = await api.post('/api/rooms', formattedData);
      
      // Make sure we have a valid room ID
      if (!response.data || !response.data._id) {
        throw new Error('Room was created but no ID was returned.');
      }
      
      toast.success('Room created successfully!');
      
      // Navigate to the new room
      navigate(`/rooms/${response.data._id}`);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to create room. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a Room</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="title" className="label">
                Room Title
              </label>
              <input
                id="title"
                type="text"
                className={`input ${errors.title ? 'border-red-500' : ''}`}
                placeholder="Friday Night Doodles, Bug Bash, Catch-Up Session..."
                {...register('title', {
                  required: 'Room title is required',
                  maxLength: {
                    value: 100,
                    message: 'Title must be 100 characters or less',
                  },
                })}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className={`input ${errors.description ? 'border-red-500' : ''}`}
                placeholder="What's the purpose of this room? What should participants expect?"
                {...register('description', {
                  required: 'Description is required',
                  maxLength: {
                    value: 500,
                    message: 'Description must be 500 characters or less',
                  },
                })}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
                  Make this a recurring room
                </label>
              </div>
              
              {isRecurring && (
                <div className="mt-2">
                  <label htmlFor="recurrencePattern" className="block text-sm font-medium text-gray-700">
                    Recurrence Pattern
                  </label>
                  <select
                    id="recurrencePattern"
                    value={recurrencePattern}
                    onChange={(e) => setRecurrencePattern(e.target.value)}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    This room will repeat according to this pattern. You can reschedule individual instances later.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="type" className="label">
                  Room Type
                </label>
                <select
                  id="type"
                  className={`input ${errors.type ? 'border-red-500' : ''}`}
                  {...register('type', { required: 'Room type is required' })}
                >
                  <option value="private">Private (invite only)</option>
                  <option value="public">Public (visible to everyone)</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="tag" className="label">
                  Tag
                </label>
                <select
                  id="tag"
                  className={`input ${errors.tag ? 'border-red-500' : ''}`}
                  {...register('tag', { required: 'Tag is required' })}
                >
                  <option value="hangout">Hangout</option>
                  <option value="work">Work</option>
                  <option value="brainstorm">Brainstorm</option>
                  <option value="wellness">Wellness</option>
                  <option value="social">Social</option>
                  <option value="focus">Focus</option>
                  <option value="other">Other</option>
                </select>
                {errors.tag && (
                  <p className="mt-1 text-sm text-red-600">{errors.tag.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="label">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="date"
                  className={`input ${errors.startDate ? 'border-red-500' : ''}`}
                  {...register('startDate', {
                    required: 'Start date is required',
                  })}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="startTime" className="label">
                  Start Time
                </label>
                <input
                  id="startTime"
                  type="time"
                  className={`input ${errors.startTime ? 'border-red-500' : ''}`}
                  {...register('startTime', {
                    required: 'Start time is required',
                  })}
                />
                {errors.startTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.startTime.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="endDate" className="label">
                  End Date
                </label>
                <input
                  id="endDate"
                  type="date"
                  className={`input ${errors.endDate ? 'border-red-500' : ''}`}
                  {...register('endDate', {
                    required: 'End date is required',
                  })}
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.endDate.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="endTime" className="label">
                  End Time
                </label>
                <input
                  id="endTime"
                  type="time"
                  className={`input ${errors.endTime ? 'border-red-500' : ''}`}
                  {...register('endTime', {
                    required: 'End time is required',
                  })}
                />
                {errors.endTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.endTime.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="maxParticipants" className="label">
                Maximum Participants (Optional)
              </label>
              <input
                id="maxParticipants"
                type="number"
                min="1"
                className={`input ${
                  errors.maxParticipants ? 'border-red-500' : ''
                }`}
                placeholder="Leave blank for unlimited"
                {...register('maxParticipants', {
                  min: {
                    value: 1,
                    message: 'Must be at least 1',
                  },
                  valueAsNumber: true,
                })}
              />
              {errors.maxParticipants && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.maxParticipants.message}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Room'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom; 