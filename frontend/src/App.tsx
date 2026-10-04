import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ErrorBoundary } from './app/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </ErrorBoundary>
  );
};
