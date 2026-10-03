/**
 * Canonical Verification Status Classifications
 * Strictly matches docs/architecture.md and docs/project-requirements.md
 */
export type VerificationStatus =
  | 'VERIFIED'
  | 'DESTINATION_MISMATCH'
  | 'UNVERIFIED'
  | 'SUSPICIOUS'
  | 'INSUFFICIENT_EVIDENCE';

/**
 * Verification Evidence Details
 */
export interface VerificationEvidence {
  finderPatternsDetected: number;
  payloadFormat: string;
  visualDeviationIndex?: number;
  boundaryAnomalyDetected?: boolean;
  notes?: string[];
}

/**
 * Standard Verification Response
 */
export interface VerificationResponse {
  verificationStatus: VerificationStatus;
  decodedPayload: string;
  normalizedDestination: string | null;
  registeredDestination: string | null;
  destinationMatch: boolean | null;
  tamperIndicators: string[];
  evidence: VerificationEvidence;
  riskFactors: string[];
  explanation: string;
  processingMetadata: {
    verificationId: string;
    timestamp: string;
    durationMs?: number;
  };
}

/**
 * Merchant Profile (Planned)
 */
export interface MerchantProfile {
  id: string;
  businessName: string;
  contactEmail: string;
  createdAt: string;
}

/**
 * Payment Destination (Planned)
 */
export interface PaymentDestination {
  id: string;
  merchantId: string;
  destinationType: 'UPI_VPA' | 'URL';
  destinationValue: string;
  isActive: boolean;
  registeredAt: string;
}
