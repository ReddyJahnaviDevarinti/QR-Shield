import { VerificationStatus } from '../types';

export const APP_NAME = 'QRShield';
export const APP_TAGLINE = 'Physical QR Tamper & Payment Destination Verification System';
export const APP_MISSION =
  'Verify whether a payment QR matches a trusted registered destination.';

export const NAV_LINKS = [
  { path: '/', label: 'Overview' },
  { path: '/verify', label: 'Verify Scan' },
  { path: '/sample-lab', label: 'Sample Lab' },
  { path: '/dashboard', label: 'Dashboard' },
] as const;

export const STATUS_DEFINITIONS: Record<
  VerificationStatus,
  { label: string; description: string }
> = {
  VERIFIED: {
    label: 'Verified',
    description:
      'Decoded destination matches an active trusted registration and no high-risk evidence was found.',
  },
  DESTINATION_MISMATCH: {
    label: 'Destination Mismatch',
    description:
      'Decoded destination conflicts with the active trusted destination registered for this merchant.',
  },
  UNVERIFIED: {
    label: 'Unverified',
    description:
      'A readable destination exists, but there is no trusted registration in the database to compare against.',
  },
  SUSPICIOUS: {
    label: 'Suspicious',
    description:
      'Visual evidence indicates a potential physical sticker overlay, border anomaly, or baseline deviation.',
  },
  INSUFFICIENT_EVIDENCE: {
    label: 'Insufficient Evidence',
    description:
      'The provided image is unreadable, out of focus, damaged, or cannot be decoded with sufficient parity.',
  },
};
