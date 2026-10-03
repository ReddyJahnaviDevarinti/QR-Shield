import React from 'react';
import { VerificationStatus } from '../types';

interface StatusBadgeProps {
  status: VerificationStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (s: VerificationStatus) => {
    switch (s) {
      case 'VERIFIED':
        return {
          color: 'var(--color-status-verified)',
          backgroundColor: 'var(--color-status-verified-bg)',
          borderColor: 'var(--color-status-verified-border)',
          label: 'VERIFIED',
        };
      case 'DESTINATION_MISMATCH':
        return {
          color: 'var(--color-status-mismatch)',
          backgroundColor: 'var(--color-status-mismatch-bg)',
          borderColor: 'var(--color-status-mismatch-border)',
          label: 'DESTINATION MISMATCH',
        };
      case 'SUSPICIOUS':
        return {
          color: 'var(--color-status-suspicious)',
          backgroundColor: 'var(--color-status-suspicious-bg)',
          borderColor: 'var(--color-status-suspicious-border)',
          label: 'SUSPICIOUS',
        };
      case 'UNVERIFIED':
        return {
          color: 'var(--color-status-unverified)',
          backgroundColor: 'var(--color-status-unverified-bg)',
          borderColor: 'var(--color-status-unverified-border)',
          label: 'UNVERIFIED',
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          color: 'var(--color-status-insufficient)',
          backgroundColor: 'var(--color-status-insufficient-bg)',
          borderColor: 'var(--color-status-insufficient-border)',
          label: 'INSUFFICIENT EVIDENCE',
        };
    }
  };

  const current = getStatusStyles(status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '24px',
        padding: '0 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        letterSpacing: '0.05em',
        border: `1px solid ${current.borderColor}`,
        backgroundColor: current.backgroundColor,
        color: current.color,
      }}
      role="status"
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: current.color,
        }}
        aria-hidden="true"
      />
      {current.label}
    </span>
  );
};
