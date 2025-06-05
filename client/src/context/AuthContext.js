import React, { createContext, useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import jwt_decode from 'jwt-decode';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if token is expired
  const isTokenExpired = (token) => {
    try {
      const decoded = jwt_decode(token);
      return decoded.exp < Date.now() / 1000;
    } catch (error) {
      return true;
    }
  };

  // Initialize auth state from localStorage
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        // Check if token is expired
        if (isTokenExpired(token)) {
          logout();
          return;
        }

        // Set auth headers for API requests
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        try {
          // Verify token and get user data
          const res = await api.get('/api/auth/profile');
          setUser(res.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth error:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  // Register user
  const register = async (formData) => {
    try {
      const res = await api.post('/api/auth/register', formData);
      const { token } = res.data;

      // Set token in localStorage and state
      localStorage.setItem('token', token);
      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Get user data
      const userRes = await api.get('/api/auth/profile');
      setUser(userRes.data);
      setIsAuthenticated(true);
      
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      console.error('Register error:', error);
      toast.error(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
      return false;
    }
  };

  // Login user
  const login = async (formData) => {
    try {
      console.log('Login attempt with:', { ...formData, password: '[REDACTED]' });
      
      const res = await api.post('/api/auth/login', formData);
      console.log('Login API response:', res.data);
      
      const { token } = res.data;

      // Set token in localStorage and state
      localStorage.setItem('token', token);
      setToken(token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Get user data
      const userRes = await api.get('/api/auth/profile');
      console.log('User profile data:', userRes.data);
      
      setUser(userRes.data);
      setIsAuthenticated(true);
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      console.error('Login response details:', {
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      toast.error(
        error.response?.data?.message || 'Login failed. Please try again.'
      );
      return false;
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete api.defaults.headers.common['Authorization'];
  };

  // Update user profile
  const updateProfile = async (formData) => {
    try {
      const res = await api.put('/api/auth/profile', formData);
      const { token } = res.data;

      // Update localStorage and state
      localStorage.setItem('token', token);
      setToken(token);
      setUser(res.data);
      
      toast.success('Profile updated successfully!');
      return true;
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error(
        error.response?.data?.message || 'Profile update failed. Please try again.'
      );
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        register,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 