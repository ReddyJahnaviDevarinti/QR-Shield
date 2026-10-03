import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="card"
      style={{
        maxWidth: '480px',
        margin: 'var(--space-12) auto',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-8) var(--space-6)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '2rem',
          fontWeight: 700,
          color: 'var(--color-brand-focus)',
        }}
      >
        404
      </span>
      <h2 style={{ fontSize: '1.25rem' }}>Page Not Found</h2>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
        The requested path does not exist within the QRShield navigation hierarchy.
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/')}
        icon={<ArrowLeft size={16} />}
      >
        Return to Overview
      </Button>
    </div>
  );
};
