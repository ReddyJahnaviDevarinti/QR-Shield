import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div
      className="card"
      style={{
        maxWidth: '500px',
        margin: 'var(--space-12) auto',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-4)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--color-brand-hover)',
        }}
      >
        404
      </span>
      <h2>Page Not Found</h2>
      <p>The requested route does not exist within the QRShield navigation hierarchy.</p>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '38px',
          padding: '0 16px',
          backgroundColor: 'var(--color-brand-primary)',
          color: '#ffffff',
          borderRadius: 'var(--radius-md)',
          fontWeight: 500,
          fontSize: '0.875rem',
          textDecoration: 'none',
        }}
      >
        Return to Overview
      </Link>
    </div>
  );
};
