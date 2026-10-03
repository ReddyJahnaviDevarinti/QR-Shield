import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Info } from 'lucide-react';
import { VerificationStatus } from '../types';

interface StatusBadgeProps {
  status: VerificationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (s: VerificationStatus) => {
    switch (s) {
      case 'VERIFIED':
        return {
          label: 'VERIFIED',
          color: 'var(--color-status-verified)',
          bg: 'var(--color-status-verified-bg)',
          border: 'var(--color-status-verified-border)',
          Icon: CheckCircle2,
        };
      case 'DESTINATION_MISMATCH':
        return {
          label: 'DESTINATION MISMATCH',
          color: 'var(--color-status-mismatch)',
          bg: 'var(--color-status-mismatch-bg)',
          border: 'var(--color-status-mismatch-border)',
          Icon: XCircle,
        };
      case 'SUSPICIOUS':
        return {
          label: 'SUSPICIOUS',
          color: 'var(--color-status-suspicious)',
          bg: 'var(--color-status-suspicious-bg)',
          border: 'var(--color-status-suspicious-border)',
          Icon: AlertTriangle,
        };
      case 'UNVERIFIED':
        return {
          label: 'UNVERIFIED',
          color: 'var(--color-status-unverified)',
          bg: 'var(--color-status-unverified-bg)',
          border: 'var(--color-status-unverified-border)',
          Icon: HelpCircle,
        };
      case 'INSUFFICIENT_EVIDENCE':
        return {
          label: 'INSUFFICIENT EVIDENCE',
          color: 'var(--color-status-insufficient)',
          bg: 'var(--color-status-insufficient-bg)',
          border: 'var(--color-status-insufficient-border)',
          Icon: Info,
        };
    }
  };

  const config = getStatusConfig(status);
  const IconComponent = config.Icon;
  const isSm = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: isSm ? '20px' : '24px',
        padding: isSm ? '0 6px' : '0 8px',
        borderRadius: 'var(--radius-sm)',
        fontSize: isSm ? '0.6875rem' : '0.75rem',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        letterSpacing: '0.04em',
        border: `1px solid ${config.border}`,
        backgroundColor: config.bg,
        color: config.color,
        whiteSpace: 'nowrap',
      }}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <IconComponent size={isSm ? 12 : 14} strokeWidth={2.25} aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
