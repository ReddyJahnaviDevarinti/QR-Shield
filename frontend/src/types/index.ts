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
 * Supabase Merchants Table Record
 */
export interface MerchantRecord {
  id: string;
  user_id: string;
  business_name: string;
  registration_number: string | null;
  contact_email: string | null;
  created_at: string;
}

/**
 * Payment Destination
 */
export interface PaymentDestination {
  id: string;
  merchantId: string;
  destinationType: 'VPA' | 'URL' | 'ACCOUNT';
  destinationValue: string;
  isActive: boolean;
  registeredAt: string;
}

/**
 * Supabase Payment Destinations Table Record
 */
export interface PaymentDestinationRecord {
  id: string;
  merchant_id: string;
  destination_type: 'VPA' | 'URL' | 'ACCOUNT';
  destination_value: string;
  is_active: boolean;
  registered_at: string;
}

/**
 * Supabase Reference QRs Table Record
 */
export interface ReferenceQrRecord {
  id: string;
  merchant_id: string;
  storage_path: string;
  payload_hash: string;
  raw_payload: string;
  uploaded_at: string;
  preview_url: string | null;
}
