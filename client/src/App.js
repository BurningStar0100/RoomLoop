import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import RoomDetail from './pages/RoomDetail';
import CreateRoom from './pages/CreateRoom';
import ExploreRooms from './pages/ExploreRooms';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import Invitations from './pages/Invitations';
import Notifications from './pages/Notifications';

// Layout
import AuthLayout from './components/layouts/AuthLayout';
import MainLayout from './components/layouts/MainLayout';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useContext(AuthContext);

  // Show loading if auth is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const App = () => {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<AuthLayout />}>
        <Route index element={<Navigate to="/login" replace />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="create-room" element={<CreateRoom />} />
        <Route path="explore" element={<ExploreRooms />} />
        <Route path="profile" element={<Profile />} />
        <Route path="invitations" element={<Invitations />} />
        <Route path="notifications" element={<Notifications />} />
      </Route>

      {/* Room Detail Route */}
      <Route
        path="/rooms/:roomId"
        element={
          <ProtectedRoute>
            <MainLayout hideNav={true} />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoomDetail />} />
      </Route>

      {/* 404 Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App; 