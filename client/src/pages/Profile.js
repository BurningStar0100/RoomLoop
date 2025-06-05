import React, { useState, useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { UserIcon } from '@heroicons/react/24/outline';

const Profile = () => {
  const { user, updateProfile } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      'profile.displayName': user?.profile?.displayName || '',
      'profile.bio': user?.profile?.bio || '',
      'profile.avatar': user?.profile?.avatar || '',
    },
  });

  // Update form when user changes (e.g., on login)
  useEffect(() => {
    if (user) {
      reset({
        username: user.username || '',
        email: user.email || '',
        'profile.displayName': user.profile?.displayName || '',
        'profile.bio': user.profile?.bio || '',
        'profile.avatar': user.profile?.avatar || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // Format data for API
      const formattedData = {
        username: data.username,
        email: data.email,
        profile: {
          displayName: data['profile.displayName'],
          bio: data['profile.bio'],
          avatar: data['profile.avatar'],
        },
      };

      // Only include password if it was provided
      if (data.password && data.password.trim() !== '') {
        formattedData.password = data.password;
      }

      const success = await updateProfile(formattedData);
      if (success) {
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Profile</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {!isEditing ? (
          // View mode
          <div className="p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {user.profile?.avatar ? (
                  <img
                    src={user.profile.avatar}
                    alt={user.username}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="ml-6 flex-1">
                <h2 className="text-xl font-semibold text-gray-900">
                  {user.profile?.displayName || user.username}
                </h2>
                <p className="text-gray-500">@{user.username}</p>
                <p className="text-gray-500 mt-1">{user.email}</p>
                
                {user.profile?.bio && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-500">Bio</h3>
                    <p className="mt-1 text-gray-900">{user.profile.bio}</p>
                  </div>
                )}
                
                <div className="mt-6">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn-primary"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Edit mode
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Edit Your Profile</h2>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="username" className="label">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  className={`input ${errors.username ? 'border-red-500' : ''}`}
                  {...register('username', {
                    required: 'Username is required',
                    minLength: {
                      value: 3,
                      message: 'Username must be at least 3 characters',
                    },
                    maxLength: {
                      value: 30,
                      message: 'Username cannot exceed 30 characters',
                    },
                  })}
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="label">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  className={`input ${errors.email ? 'border-red-500' : ''}`}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: 'Please enter a valid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="profile.displayName" className="label">
                  Display Name
                </label>
                <input
                  id="profile.displayName"
                  type="text"
                  className="input"
                  {...register('profile.displayName')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  This is how your name will appear to others
                </p>
              </div>

              <div>
                <label htmlFor="profile.bio" className="label">
                  Bio
                </label>
                <textarea
                  id="profile.bio"
                  rows={3}
                  className="input"
                  placeholder="Tell others a bit about yourself"
                  {...register('profile.bio')}
                />
              </div>

              <div>
                <label htmlFor="profile.avatar" className="label">
                  Avatar URL
                </label>
                <input
                  id="profile.avatar"
                  type="text"
                  className="input"
                  placeholder="https://example.com/your-avatar.jpg"
                  {...register('profile.avatar')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter a URL to an image to use as your profile picture
                </p>
              </div>

              <div>
                <label htmlFor="password" className="label">
                  New Password (Optional)
                </label>
                <input
                  id="password"
                  type="password"
                  className={`input ${errors.password ? 'border-red-500' : ''}`}
                  placeholder="Leave blank to keep current password"
                  {...register('password', {
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
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
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile; 