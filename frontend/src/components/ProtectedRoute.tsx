import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingState } from './LoadingState';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--space-12) 0',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <LoadingState label="Verifying merchant authentication session..." />
      </div>
    );
  }

  if (!user || !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
