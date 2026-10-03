import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';

export const RootLayout: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          paddingTop: 'var(--space-6)',
          paddingBottom: 'var(--space-8)',
        }}
      >
        <div className="container">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};
