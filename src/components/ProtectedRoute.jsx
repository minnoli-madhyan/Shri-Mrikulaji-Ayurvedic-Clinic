// src/components/ProtectedRoute.jsx
// Supports role="admin" | role="doctor" | role="patient" | no role (any logged-in user)

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Leaf } from 'lucide-react';

const ProtectedRoute = ({ children, role }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e6f0ec] gap-3">
        <Leaf className="text-emerald-700 animate-pulse" size={32} />
        <p className="text-olive/60 text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  // Not logged in at all
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Profile not loaded yet (rare race condition — wait)
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#e6f0ec] gap-3">
        <Leaf className="text-emerald-700 animate-pulse" size={32} />
        <p className="text-olive/60 text-sm animate-pulse">Loading profile...</p>
      </div>
    );
  }

  // Logged in but wrong role → redirect to their own dashboard
  if (role && profile.role !== role) {
    const redirectMap = {
      admin:   '/admin-dashboard',
      doctor:  '/doctor-dashboard',
      patient: '/patient-dashboard',
    };
    return <Navigate to={redirectMap[profile.role] ?? '/'} replace />;
  }

  return children;
};

export default ProtectedRoute;
