export { composeVerificationResult } from './engine.js';

export {
  CanonicalCompositeStatus,
  CompositeDestinationEvidence,
  CompositeEvidence,
  CompositeImageQualityEvidence,
  CompositeRecommendation,
  CompositeRiskFactor,
  CompositeTamperEvidence,
  CompositeVerificationInput,
  CompositeVerificationResult,
} from './types.js';

export {
  aggregateRiskFactors,
  evaluateCompositeStatus,
  getRecommendationForStatus,
  VISUAL_DEVIATION_HIGH_THRESHOLD,
} from './rules.js';
