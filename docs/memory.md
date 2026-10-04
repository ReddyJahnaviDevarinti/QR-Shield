# QRShield AI — Project Memory

Status: ACTIVE
Current Phase: Phase 6 — Physical Tamper Analysis & Quality Screening
Current Sub-Phase: Prompt 014 Complete (Deterministic Image Quality Analyzer)
Last Updated: 2026-10-04

---

## 1. Completed

The following items and components have been implemented, verified, and locked in the repository:

- **Project Documentation Foundation**:
  - `docs/project-requirements.md`: Threat vectors, canonical statuses, MVP scope, evaluation framework.
  - `docs/architecture.md`: Multi-tier architecture, deterministic vs. LLM boundary, locked technology stack.
  - `docs/rules.md`: Strict engineering standards, security, WCAG AA accessibility, visual restrictions.
  - `docs/phases.md`: 17 gated development phases (Phase 0 to Phase 16).
  - `docs/design.md`: Production-ready design system specification (tokens, typography, 8px grid, components, motion).
  - `docs/memory.md`: Living record of actual project state and technology verification.
- **Git & Repository Initialization**:
  - Clean GitHub synchronization (`main` branch tracked).
  - Root `.gitignore`, `.env.example`, `README.md`, placeholder folders.
- **Design System & Centralized Design Tokens (`frontend/src/styles/tokens.css`, `index.css`)**:
  - Exact palette implemented: Dark slate canvas (`#080C12`, `#0D1420`), surfaces (`#111927`, `#162132`, `#1C283D`), borders (`#243247`, `#2B3A50`, `#60A5FA`), text (`#F5F7FA`, `#A8B4C5`, `#718096`), primary blue (`#2563EB`, `#3B82F6`, `#1D4ED8`, `#60A5FA`).
  - Zero purple accents, zero gradients, zero floating shadows.
  - Strict 8px spacing system: 4, 8, 12, 16, 24, 32, 40, 48, 64px.
  - Modest radii: 6px, 8px, 10px, 12px; pills (9999px) reserved exclusively for statuses and compact tags.
  - Typography: `Inter` for UI & display, `JetBrains Mono` for technical data, payloads, and statuses.
- **Reusable UI Component System (`frontend/src/components/`)**:
  - `Button.tsx`: Solid primary blue, neutral secondary with border, outline, danger, ghost variants; heights 32/38/44px; outline icon support.
  - `Input.tsx`: Accessible input with `<label>`, helper text, error state, and monospace variant.
  - `Select.tsx`: Accessible select with custom SVG indicator and option styling.
  - `FileDropzone.tsx`: QR upload dropzone supporting 7 visual states (`idle`, `hover`, `dragover`, `uploading`, `processing`, `success`, `failure`) and keyboard interaction.
  - `Card.tsx`: Standardized card/panel with header, subtitle, badge, and action slots.
  - `PageHeader.tsx`: Structured page header with category badge, H1 title, subtitle, and responsive actions.
  - `StatusBadge.tsx`: Canonical 5-status badge (`VERIFIED`, `DESTINATION_MISMATCH`, `SUSPICIOUS`, `UNVERIFIED`, `INSUFFICIENT_EVIDENCE`) with distinct outline icons, color, accessible contrast tint, and non-color cues.
  - `Alert.tsx`: Accessible alert banner (`info`, `warning`, `error`, `success`) with semantic icons and ARIA roles.
  - `EmptyState.tsx`: Honest empty states without fake data or metrics.
  - `LoadingState.tsx`: Spinner and skeleton shimmer modes with accessible `aria-busy="true"`.
  - `ErrorState.tsx`: Diagnostic failure display with retry action.
  - `DataRow.tsx`: Monospace technical key-value data rows.
  - `Divider.tsx`: 1px border divider with optional uppercase monospace label.
  - `TextLink.tsx`: Internal and external link component with icon support.
  - `Header.tsx`: Application header with `ShieldCheck` brand icon, `UI Foundation` indicator, desktop nav, and responsive mobile nav toggle and drawer.
  - `Footer.tsx`: Restrained footer with `QRShield` — Payment QR Verification branding and operational notice.
- **Product Entry Point & Console Shells (`frontend/src/pages/`)**:
  - `HomePage.tsx`: Real product entry point answering the 3 core questions ("What does QRShield do?", "What can I do here?", "What should I click next?") with primary action "Verify a QR", secondary action "Open Dashboard", 3-pillar mechanism overview, and canonical status cards.
  - `VerifyPage.tsx`: Future verification console reserving space for 7 visual sections (A. Ingestion & Target, B. Verification State, C. Decoded Payload, D. Destination Parity, E. Visual Evidence, F. Risk Factors, G. Explanation & Reasoning) with explicit honest empty state: *"No scan submitted."*
  - `DashboardPage.tsx`: Administrative workspace reserving 5 visual sections (1. Merchant Identity, 2. Trusted Payment Destinations, 3. Registered Reference QR Assets, 4. Verification History, 5. Verification Policies & Configuration) with explicit honest empty state: *"No trusted destinations registered yet."*
  - `NotFoundPage.tsx`: 404 error page using standard design tokens and return action.
- **Prompt 006A UI Foundation QA Fixes**:
  - **React Router Future-Flag Warnings**: Configured `v7_relativeSplatPath: true` on `createBrowserRouter` in `src/app/router.tsx` and `v7_startTransition: true` on `RouterProvider` in `src/App.tsx`. Zero console warnings on route changes.
  - **Removed Unimplemented Action Buttons**: Removed `Export Audit Logs`, `Register Destination`, `Add VPA`, and `Upload Asset` from `DashboardPage.tsx`. The dashboard does not display buttons that imply functionality before implementation.
  - **Corrected Session & Auth Language**: Replaced misleading session language (`"Unregistered / Session Active"`) in `DashboardPage.tsx` with factual foundation wording: `"Authentication not configured"` and `"Merchant profile not connected"`.
  - **Preserved Existing Design**: Colors, typography, spacing, navigation, and component contracts remained identical.
- **Dependencies Added**:
  - `lucide-react` (installed cleanly, only authorized icon library).
  - `@supabase/supabase-js` (official Supabase client for browser data/auth operations).
  - No CSS frameworks introduced (Tailwind, MUI, Bootstrap, Chakra are absent).
- **Prompt 007 Supabase Frontend Client Integration**:
  - Protected `.env.local` via `.gitignore`.
  - Configured `frontend/src/lib/supabase.ts` with typed client reading `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Validated connection against existing schema tables (`merchants`, `payment_destinations`, `reference_qrs`, `verification_logs`) returning status 200 with RLS enforced and zero mutations.
  - Updated `vite-env.d.ts` with publishable key type declaration.
- **Prompt 008 Backend Foundation (Fastify + TypeScript)**:
  - Initialized Node.js + TypeScript Fastify service in `backend/` targeting Render deployment.
  - Installed minimal runtime dependencies: `fastify`, `@fastify/cors`, `@fastify/helmet`.
  - Installed development tooling: `typescript`, `@types/node`, `tsx`, `eslint`, `prettier`, `typescript-eslint`.
  - Implemented typed environment configuration (`src/config/env.ts`) reading `PORT` (8000), `NODE_ENV` (development), and `ALLOWED_ORIGINS` (http://localhost:5173).
  - Implemented application factory pattern (`src/app.ts`) separated from server network listener for isolated testing.
  - Configured structured Fastify logging with sensitive token/secret redaction.
  - Configured centralized error handler returning uniform JSON shapes without leaking stack traces in production.
  - Implemented `GET /api/v1/health` (`src/routes/health.ts`) returning dynamic ISO timestamp, version `1.0.0`, and process uptime seconds without requiring Supabase or Gemini.
  - Implemented server startup and graceful shutdown on `SIGINT` / `SIGTERM` (`src/server.ts`).
  - Created `backend/.env.example` with non-secret placeholders only.
  - Validated locally: `npm run lint`, `npm run format:check`, `npm run build`, and verified `GET /api/v1/health` returns status `ok`.
- **Prompt 009 Deterministic QR Decoder (`backend/src/modules/qr-decoder/`)**:
  - Implemented pure in-memory deterministic QR matrix decoding engine using `sharp` (pixel normalization to RGBA) and `jsqr` (matrix decoding).
  - Defined strong types (`types.ts`): `DecodedQr`, `QrPoint`, `QrLocation`, format unions.
  - Defined controlled error hierarchy (`errors.ts`): `QrDecoderError`, `InvalidImageError` (`E_INVALID_IMAGE`), `NoQrDetectedError` (`E_NO_QR_DETECTED`), `DecodeFailedError` (`E_DECODE_FAILED`) with no stack trace leakage.
  - Decoupled decoder API (`decoder.ts`): `decodeQr(buffer: Buffer): Promise<DecodedQr>` independent from Fastify and free of business-specific UPI logic.
  - Zero LLM / Gemini involvement in QR decoding; strictly deterministic.
  - Configured Vitest test runner (`vitest.config.ts`, `npm run test`).
  - Implemented comprehensive unit test suite (`decoder.test.ts`): 9 tests covering UPI URIs, URLs, plain text, invalid bytes, empty buffers, format conversions (PNG, JPEG, WebP), non-QR solid images, and input guards.
  - Verified manual decoding of `upi://pay?pa=store@icici&pn=Test%20Store&mc=5411` with exact matching payload, 400x400 dimensions, and 3 finder patterns.
- **Prompt 010 Deterministic Payment Payload Parser (`backend/src/modules/payment-parser/`)**:
  - Implemented pure deterministic payment payload parser converting raw QR strings into strongly typed discriminated models (`UPI_URI`, `GENERIC_URL`, `TEXT`).
  - Supported UPI parameters: `pa` (canonical payment destination), `pn` (payee name), `am` (amount as string), `mc` (merchant category code), `cu` (currency with default 'INR'), `mode`, `url`, `refUrl`.
  - Enforced strict normalization: trimming, URL/percent-decoding (handling `%20`, `+`, `%26`, `%40`), and lowercasing `pa` without losing semantic content.
  - Implemented controlled error hierarchy (`errors.ts`): `EmptyPayloadError` (`E_EMPTY_PAYLOAD`), `MalformedUriError` (`E_MALFORMED_URI`), `InvalidUpiPayloadError` (`E_INVALID_UPI_PAYLOAD`), `AmbiguousParameterError` (`E_AMBIGUOUS_PARAMETER`), `InvalidAmountError` (`E_INVALID_AMOUNT`), `InvalidCurrencyError` (`E_INVALID_CURRENCY`), `InvalidMccError` (`E_INVALID_MCC`).
  - Strict duplicate handling: rejects duplicate security-sensitive parameters (`pa`, `am`, `cu`, `pn`, `mc`) as ambiguous; deterministically retains first occurrence for non-security parameters.
  - Pure CPU in-memory execution: zero network calls, zero file I/O, zero database queries, zero LLM / Gemini involvement.
  - Implemented comprehensive unit test suite (`parser.test.ts`): 16 tests covering full UPI URI, minimal UPI URI with INR default, encoded merchant names, VPA trimming/lowercasing, generic URLs, plain text, missing pa, empty payloads, invalid amount, invalid currency, invalid MCC, duplicate security parameters, deterministic non-security duplicates, malformed URI handling, zero network requests assertion, and case-insensitive query parameter keys.
  - All 25 backend tests passing cleanly.
- **Prompt 011 Deterministic Verification Engine (`backend/src/modules/verification-engine/`)**:
  - Implemented pure deterministic destination verification engine resolving: "Does the decoded payment destination match a trusted registered destination?"
  - Defined trusted registration model (`TrustedDestination`) without exposing private banking credentials.
  - Enforced strict canonical statuses (`VERIFIED`, `DESTINATION_MISMATCH`, `UNVERIFIED`, `INSUFFICIENT_EVIDENCE`), excluding `SUSPICIOUS` (deferred to visual tamper layer) and prohibiting subjective terms like "fake" or "fraud".
  - Defined machine-readable reason codes: `DESTINATION_MATCH`, `DESTINATION_CONFLICT`, `NO_TRUSTED_REGISTRATION`, `NO_PAYMENT_DESTINATION`, `INSUFFICIENT_DESTINATION_DATA`.
  - Enforced deterministic status precedence:
    1. Usable destination missing -> `INSUFFICIENT_EVIDENCE`
    2. Unstructured content (TEXT) -> `UNVERIFIED` (`NO_PAYMENT_DESTINATION`)
    3. No active trusted registrations -> `UNVERIFIED` (`NO_TRUSTED_REGISTRATION`)
    4. Exact normalized string match with active registration -> `VERIFIED` (`DESTINATION_MATCH`)
    5. Active registrations exist but none match -> `DESTINATION_MISMATCH` (`DESTINATION_CONFLICT`)
  - Complete isolation from payee name, amount, MCC, currency, and network/db/AI layers.
  - Implemented comprehensive Vitest test suite (`engine.test.ts`): 18 tests covering VPA exact match, case/whitespace normalization, VPA mismatch, empty/inactive registrations, multiple trusted anchors, URL exact match and mismatch, TEXT handling, insufficient evidence, payee name / amount / MCC independence, zero network / zero filesystem calls, and deterministic idempotency.
  - All 43 backend tests passing cleanly.
- **Prompt 012 Supabase Trusted Registry Adapter (`backend/src/integrations/`)**:
  - Installed `@supabase/supabase-js` in `backend/package.json` without `@supabase/ssr`.
  - Configured typed backend environment variables (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) with fail-fast validation on startup without exposing secret values in error messages.
  - Updated `backend/.env.example` with placeholders only; verified `backend/.env` is strictly gitignored.
  - Created server-only Supabase client (`src/integrations/supabase/client.ts`) configured with `persistSession: false`, `autoRefreshToken: false`, and `detectSessionInUrl: false`.
  - Implemented narrow read-only trusted registry repository (`src/integrations/trusted-registry/`):
    - `findActiveTrustedDestinations`: Queries `payment_destinations` with exact projection (`merchant_id, destination_type, destination_value, is_active`), filters `is_active = true`, matches `destination_type`, and enforces deterministic string matching.
    - Zero mutation operations: does not insert, update, upsert, or delete database rows.
    - Zero external bank calls, zero DNS resolutions, zero URL following.
    - `checkRegistryConnection`: Safe `LIMIT 1` read query confirming live reachability without creating test rows.
    - Controlled error hierarchy: `RegistryError`, `SupabaseNotConfiguredError` (`E_SUPABASE_NOT_CONFIGURED`), `RegistryQueryFailedError` (`E_REGISTRY_QUERY_FAILED`).
  - Implemented comprehensive mocked Vitest test suite (`repository.test.ts`): 13 tests covering active VPA mapping, active URL mapping, inactive exclusion, type mismatch filtering, empty results, error handling, projection purity, mutation absence, zero network leakage, secret protection, verification engine compatibility, and determinism.
  - Verified live database reachability against Supabase using real `SUPABASE_SECRET_KEY` in `backend/.env` with 0 mutations, verified zero-row handling, and zero secret leakage.
  - All 56 backend tests passing cleanly.

- **Prompt 013 End-to-End Verification API (`POST /api/v1/verify`)**:
  - Installed `@fastify/multipart` with safe payload limits (10 MB maximum file size, 1 file maximum).
  - Extended Supabase trusted registry adapter with `findActiveTrustedDestinationsForMerchant(merchantId, destinationType)` returning active destinations for specified merchant and type without mutations or broad merchant listings.
  - Implemented `POST /api/v1/verify` route handler (`backend/src/routes/verify.ts`):
    - Accepts `multipart/form-data` with required `image` file and optional `merchant_id` and `opt_in_audit` fields.
    - Strictly validates MIME types (`image/jpeg`, `image/png`, `image/webp`), non-empty buffer, and size limits in-memory without writing to disk or uploading to Supabase Storage.
    - Deterministic pipeline orchestration: `decodeQr` -> `parsePaymentPayload` -> registry lookup -> pure `verifyDestination`.
    - Public Mode (no `merchant_id`): matches scanned destination in registry; returns `VERIFIED` on match or `UNVERIFIED` on no match.
    - Merchant Context Mode (`merchant_id` present): queries active destinations for merchant; returns `VERIFIED`, `DESTINATION_MISMATCH`, or `UNVERIFIED`.
    - Pure verification engine remains sole canonical status decision maker.
    - Response contract: `verification_status`, `decoded_payload`, `normalized_destination`, `registered_destination`, `destination_match`, `evidence`, `risk_factors`, `explanation` (deterministic fallback), and `processing_metadata` with real UUID (`verification_id`), dynamic ISO timestamp, and measured non-negative duration (`duration_ms`).
    - Controlled error mapping: 400 (missing/empty/unsupported/corrupt image), 413 (payload too large), 422 (no QR detected, malformed payload), 503 (registry unavailable), 500 (internal error) with structured JSON `{ error: { code, message, details } }` and zero secret / SQL / stack trace leakage.
    - Route registered in `backend/src/app.ts`; existing `GET /api/v1/health` verified intact.
    - Comprehensive automated test suite (`backend/src/routes/verify.test.ts`, 25 tests) mocking external boundaries via `app.inject()` and in-memory `qrcode` fixtures.
    - Live local diagnostic against `http://localhost:8000/api/v1/verify` with `nonexistent-store@icici` verified returning HTTP 200 `UNVERIFIED` and server cleanly shut down.
    - Total backend tests: 87 passing across 5 test suites. Working tree clean. Zero database mutations. Zero Storage uploads. Zero Gemini calls. Zero frontend changes.

- **Prompt 014 Deterministic Image Quality Analyzer (`backend/src/modules/image-quality/`)**:
  - Implemented pure deterministic image quality analyzer evaluating whether uploaded QR images meet visual standards for reliable downstream QR and tamper processing.
  - Used Sharp for safe in-memory decoding, EXIF rotation (`.rotate()`), bounded grayscale conversion (`.resize()` to 512px max dimension), and raw pixel normalization without disk writes or buffer mutation.
  - Computed 7 core deterministic metrics:
    1. `width` (source px)
    2. `height` (source px)
    3. `pixelCount` (source width * height)
    4. `meanBrightness` (normalized 0.0 to 1.0)
    5. `contrastScore` (normalized standard deviation / 127.5, 0.0 to 1.0)
    6. `sharpnessScore` (normalized variance of discrete 2D Laplacian, 0.0 to 1.0)
    7. `dynamicRange` (max - min intensity / 255.0, 0.0 to 1.0)
  - Defined explicit initial engineering heuristics in `rules.ts`:
    - `BRIGHTNESS_TOO_DARK_THRESHOLD` (0.20), `BRIGHTNESS_TOO_BRIGHT_THRESHOLD` (0.85) -> `TOO_DARK`, `ACCEPTABLE`, `TOO_BRIGHT`
    - `CONTRAST_LOW_THRESHOLD` (0.25) -> `LOW_CONTRAST`, `ACCEPTABLE_CONTRAST`
    - `SHARPNESS_BLUR_THRESHOLD` (0.15), `SHARPNESS_EXTREME_BLUR_THRESHOLD` (0.04) -> `BLURRY`, `ACCEPTABLE_SHARPNESS`
    - `DYNAMIC_RANGE_LOW_THRESHOLD` (0.30)
    - `MIN_USABLE_DIMENSION` (64px), `MIN_RECOMMENDED_DIMENSION` (200px)
  - Emitted deterministic overall decisions: `ACCEPTABLE`, `DEGRADED`, `INSUFFICIENT` with diagnostic `qualityFlags`.
  - Defined controlled errors: `InvalidImageError` (`E_INVALID_IMAGE`), `ImageTooLargeError` (`E_IMAGE_TOO_LARGE`), `ImageAnalysisFailedError` (`E_IMAGE_ANALYSIS_FAILED`).
  - Implemented comprehensive Vitest test suite (`analyzer.test.ts`, 22 tests) covering high-quality QR, dark, bright, low-contrast, blurred, tiny dimensions, low resolution, random bytes, empty buffer, unsupported formats, JPEG/WebP formats, determinism, network isolation, buffer non-mutation, and exact threshold boundary testing.
  - Zero ML models, zero OpenCV, zero Gemini, zero network calls, zero database mutations, zero frontend changes.
  - All 109 backend tests passing cleanly.

- **Prompt 015 Deterministic Physical QR Tamper Analysis (`backend/src/modules/tamper-analysis/`)**:
  - Implemented pure deterministic in-memory visual comparison engine evaluating whether a scanned candidate QR visually deviates from a trusted reference QR.
  - Core design principle: This is NOT a fraud classifier, NOT an AI detector, and NEVER outputs canonical verification statuses (`VERIFIED`, `DESTINATION_MISMATCH`, `UNVERIFIED`, `SUSPICIOUS`) or subjective claims like "fraud", "fake QR", or "scam confirmed".
  - Created modular architecture:
    - `types.ts`: `TamperAnalysisResult`, `AlignmentClassification` (`GOOD`, `DEGRADED`, `INSUFFICIENT`), `AnalysisQuality` (`COMPARABLE`, `DEGRADED`, `INSUFFICIENT`), `TamperRecommendation` (`NO_SIGNIFICANT_VISUAL_DEVIATION`, `REVIEW_VISUAL_DIFFERENCE`, `MANUAL_INSPECTION_RECOMMENDED`, `INSUFFICIENT_VISUAL_EVIDENCE`), structured `AnomalyIndicator` set (`MATRIX_STRUCTURAL_DIFFERENCE`, `BOUNDARY_EDGE_ANOMALY`, `ALIGNMENT_DEGRADED`, `ALIGNMENT_INSUFFICIENT`, `CANDIDATE_QR_NOT_DETECTED`, `REFERENCE_QR_NOT_DETECTED`, `LOW_COMPARABILITY`).
    - `errors.ts`: Controlled error hierarchy (`TamperAnalysisError`, `InvalidReferenceImageError`, `InvalidCandidateImageError`, `ReferenceQrNotDetectedError`, `CandidateQrNotDetectedError`, `AlignmentFailedError`, `ComparisonFailedError`) preventing leakage of stack traces, paths, or buffer contents.
    - `rules.ts`: Explicit constants labeled as INITIAL ENGINEERING HEURISTICS (`CANONICAL_QR_SIZE = 256`, `BOUNDARY_MARGIN_RATIO = 0.12`, `WEIGHT_MATRIX_MISMATCH = 0.60`, `WEIGHT_BOUNDARY_ANOMALY = 0.25`, `WEIGHT_STRUCTURAL_DIFF = 0.15`, `VISUAL_DEVIATION_REVIEW_THRESHOLD = 0.20`, `VISUAL_DEVIATION_HIGH_THRESHOLD = 0.35`, `BOUNDARY_ANOMALY_THRESHOLD = 0.35`, `ALIGNMENT_GOOD_THRESHOLD = 0.70`, `ALIGNMENT_DEGRADED_THRESHOLD = 0.45`), with pure deterministic evaluation functions (`classifyAlignment`, `computeVisualDeviationIndex`, `evaluateTamperRecommendation`).
    - `geometry.ts`: 4-point quadrilateral convexity, minimum area (400 px²), diagonal ratio, opposite side symmetry, aspect ratio, and corner angle orthogonality validation; closed-form 3x3 Heckbert projective homography mapping unit square $(u, v) \in [0, 1]^2$ to detected corner coordinates; bilinear interpolation sampler warping images into canonical $256 \times 256$ arrays.
    - `comparison.ts`: Optimal Otsu thresholding with plateau midpoint averaging for illumination invariance; binary matrix mismatch ratio computation; normalized grayscale structural difference; Sobel gradient magnitude edge density disparity and interface boundary step discontinuity calculation for sticker cutline / overlay detection.
    - `analyzer.ts`: Orchestrates pipeline `analyzeQrVisualDifference(referenceBuffer, candidateBuffer)` using existing `decodeQr()` for geometry detection without disk I/O, network calls, or buffer mutations.
    - `index.ts`: Clean public exports.
    - `analyzer.test.ts`: 25 comprehensive tests covering identical images, moderate brightness robustness, moderate contrast robustness, slight rotation, scaling differences, simulated sticker border overlay anomaly, different payload structural matrix divergence, invalid reference/candidate images, missing reference/candidate QR, degenerate alignment, determinism, network isolation, filesystem isolation, buffer immutability, result type integrity, and exact threshold boundary testing (just below, at, just above).
  - Total backend tests: 134 passing across 7 test suites. Working tree clean. Zero database mutations. Zero Storage uploads. Zero Gemini calls. Zero frontend changes.

- **Prompt 016 Deterministic Composite Verification Engine (`backend/src/modules/composite-verification/`)**:
  - Implemented the composite verification decision layer combining:
    1. Deterministic destination verification (`VerificationResult` from `verification-engine`)
    2. Deterministic image-quality evidence (`ImageQualityResult` from `image-quality`)
    3. Optional physical QR tamper evidence (`TamperAnalysisResult` from `tamper-analysis`)
    into ONE unified canonical status: `VERIFIED`, `DESTINATION_MISMATCH`, `UNVERIFIED`, `SUSPICIOUS`, or `INSUFFICIENT_EVIDENCE`.
  - Strictly enforced architectural trust constraints:
    - Never alleges "fraud confirmed", "fake QR", "scam confirmed", or claims guaranteed safety / bank ownership.
    - Destination conflict strictly takes precedence over visual evidence (`DESTINATION_MISMATCH`).
    - Unregistered QR remains `UNVERIFIED` even if image quality or visual evidence is abnormal; visual deviation does not manufacture suspicion for unregistered codes.
    - Insufficient image quality yields `INSUFFICIENT_EVIDENCE`, preventing false positive tampering declarations.
    - Suspicion (`SUSPICIOUS`) requires a matching destination combined with verified visual anomalies (`boundaryAnomalyDetected = true` or `visualDeviationIndex >= VISUAL_DEVIATION_HIGH_THRESHOLD`).
    - Degraded quality or inconclusive tamper analysis is treated as supporting evidence (`IMAGE_QUALITY_DEGRADED`, `TAMPER_ANALYSIS_INCONCLUSIVE`) without flipping verified codes to suspicious.
  - Modular structure:
    - `types.ts`: `CanonicalCompositeStatus`, `CompositeRecommendation`, `CompositeRiskFactor`, `CompositeEvidence`, `CompositeVerificationResult`, `CompositeVerificationInput`.
    - `rules.ts`: Deterministic status precedence (Rules C01 - C06), deduplicated risk factor aggregation, recommendation mapping, and re-export of `VISUAL_DEVIATION_HIGH_THRESHOLD` without threshold duplication.
    - `engine.ts`: Pure in-memory orchestration `composeVerificationResult()` supporting both positional arguments and input object with zero mutations on source parameters.
    - `index.ts`: Clean module exports.
    - `engine.test.ts`: 34 comprehensive tests covering the 22 core requirements, full 8-case status precedence matrix (Rules C01 - C06), exact visual deviation boundary tests (just below, at, just above), input immutability, network/filesystem isolation, and object overload.
  - Total backend tests: 168 passing across 8 test suites. Working tree clean. Zero database mutations. Zero Storage uploads. Zero Gemini calls. Zero frontend changes.

- **Prompt 017 End-to-End Image Quality & Composite Verification API Integration (`backend/src/routes/verify.ts`)**:
  - Integrated `analyzeImageQuality` and `composeVerificationResult` into the `POST /api/v1/verify` route handler.
  - Final pipeline order strictly enforced:
    1. Read and validate uploaded image (multipart, size, MIME type)
    2. `decodeQr(imageBuffer)`
    3. `parsePaymentPayload(decoded.rawPayload)`
    4. Query trusted registry for active destination records
    5. `verifyDestination(parsedPayload, trustedDestinations)`
    6. `analyzeImageQuality(imageBuffer)`
    7. `composeVerificationResult(destinationResult, imageQualityResult, null)` (tamper is `null` until reference QR storage integration)
    8. Compose and return unified response contract
  - Response contract extended with structured composite and image quality evidence:
    - `verification_status`: Canonical status from `composeVerificationResult().status` (`VERIFIED`, `DESTINATION_MISMATCH`, `UNVERIFIED`, `INSUFFICIENT_EVIDENCE`).
    - `image_quality`: Full metrics including `overall_quality`, `mean_brightness`, `contrast_score`, `sharpness_score`, `dynamic_range`, exposure/contrast/sharpness classifications, and `quality_flags`.
    - `composite_evidence`: Structured nested evidence for destination, image quality, and `tamper: { available: false }`.
    - `risk_factors`: Machine-readable array from composite engine (`IMAGE_QUALITY_INSUFFICIENT`, `DESTINATION_CONFLICT`, `NO_TRUSTED_REGISTRATION`, etc.).
    - `recommendation`: Canonical recommendation from composite engine (`REVIEW_NOT_REQUIRED`, `CAPTURE_CLEARER_IMAGE`, `DO_NOT_PROCEED_WITH_PAYMENT`, etc.).
    - `explanation`: Deterministic neutral explanation aligned to composite result.
    - `processing_metadata`: Real UUID `verification_id`, dynamic ISO timestamp, and measured non-negative duration in ms.
  - Controlled error mapping: catches `ImageQualityError` mapping to controlled JSON without leaking buffers, stack traces, or file paths.
  - Comprehensive integration test suite: 9 new tests added to `verify.test.ts` (34 total route tests, 177 total backend tests across 8 suites).
  - Executed live local diagnostic tests against real Supabase instance (`51bc512c-7945-4404-bd24-4316ce924daa`, `qrshield-test@icici`):
    - Confirmed real local `VERIFIED` result with `overall_quality: ACCEPTABLE`, `destination_match: true`, `tamper.available: false`.
    - Confirmed real local `INSUFFICIENT_EVIDENCE` result with synthetic degraded image crossing low resolution, dark exposure, and blur thresholds.
    - Confirmed real local `DESTINATION_MISMATCH` result with attacker VPA.
  - Total backend tests: 177 passing across 8 test suites. Working tree clean. Zero database mutations. Zero Storage uploads. Zero Gemini calls. Zero frontend changes.

### Not Completed (Explicitly Pending Future Phases)
- Authentication UI & Session Hooks (Phase 1 — Supabase Auth)
- Dashboard Shell & Backend Persistence Integration (Phase 2)
- Merchant Admin Registry Endpoints (Phase 3)
- Calibrated Risk Engine (Phase 7)
- Google Gemini Explanation Layer (Phase 8)
- Sample Lab Test Harness (Phase 9)
- Verification Audit History & Verification Logs Table Writing (Phase 10)
- Testing & Benchmark Suite (Phase 11)
- Security Hardening (Phase 12)
- Production Build Preparation (Phase 13)
- Cloud Deployment on Vercel & Render (Phase 14)
- Custom Domain, Favicon & Compliance (Phase 15)
- Final Evaluator Walkthrough (Phase 16)

---

## 2. Currently Working On

Completed **Prompt 017 (Integrate Image Quality + Composite Verification into API)**. Ready for next phase (calibrated risk engine or reference QR storage integration).

---

## 3. Current Repository Structure

```
QR-Shield/
├── .env.example
├── .gitignore
├── README.md
├── docs/
│   ├── architecture.md
│   ├── design.md
│   ├── memory.md
│   ├── phases.md
│   ├── project-requirements.md
│   └── rules.md
├── backend/
│   ├── .env.example
│   ├── .prettierrc
│   ├── eslint.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       │   └── env.ts
│       ├── integrations/
│       │   ├── supabase/
│       │   │   └── client.ts
│       │   └── trusted-registry/
│       │       ├── errors.ts
│       │       ├── index.ts
│       │       ├── repository.test.ts
│       │       ├── repository.ts
│       │       └── types.ts
│       ├── modules/
│       │   ├── payment-parser/
│       │   │   ├── errors.ts
│       │   │   ├── index.ts
│       │   │   ├── parser.test.ts
│       │   │   ├── parser.ts
│       │   │   └── types.ts
│       │   ├── qr-decoder/
│       │   │   ├── decoder.test.ts
│       │   │   ├── decoder.ts
│       │   │   ├── errors.ts
│       │   │   ├── index.ts
│       │   │   └── types.ts
│       │   └── verification-engine/
│       │       ├── engine.test.ts
│       │       ├── engine.ts
│       │       ├── index.ts
│       │       ├── rules.ts
│       │       └── types.ts
│       ├── plugins/
│       │   └── security.ts
│       └── routes/
│           └── health.ts
├── sample-data/
│   └── .gitkeep
├── tests/
│   └── .gitkeep
└── frontend/
    ├── .prettierrc
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── public/
    │   └── favicon.svg
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── vite-env.d.ts
        ├── app/
        │   ├── ErrorBoundary.tsx
        │   └── router.tsx
        ├── components/
        │   ├── Alert.tsx
        │   ├── Button.tsx
        │   ├── Card.tsx
        │   ├── DataRow.tsx
        │   ├── Divider.tsx
        │   ├── EmptyState.tsx
        │   ├── ErrorState.tsx
        │   ├── FileDropzone.tsx
        │   ├── Footer.tsx
        │   ├── Header.tsx
        │   ├── index.ts
        │   ├── Input.tsx
        │   ├── LoadingState.tsx
        │   ├── PageHeader.tsx
        │   ├── Select.tsx
        │   ├── StatusBadge.tsx
        │   └── TextLink.tsx
        ├── features/
        │   └── README.md
        ├── layouts/
        │   └── RootLayout.tsx
        ├── lib/
        │   └── constants.ts
        ├── pages/
        │   ├── DashboardPage.tsx
        │   ├── HomePage.tsx
        │   ├── NotFoundPage.tsx
        │   └── VerifyPage.tsx
        ├── services/
        │   └── api.ts
        ├── styles/
        │   ├── index.css
        │   └── tokens.css
        ├── types/
        │   └── index.ts
        └── utils/
            └── formatters.ts
```

---

## 4. Technology State

| Technology | Role | Status |
| :--- | :--- | :--- |
| **React 18** | UI component rendering | Active & validated in `frontend/` |
| **TypeScript 5** | Strict type safety | Active & validated (`tsc -b` passes) |
| **Vite 6** | Bundler and dev server | Active & validated (Production build passes) |
| **React Router 6** | Client-side routing | Active & validated (`/`, `/verify`, `/dashboard`, `*`) with future flags |
| **lucide-react** | Outline SVG icon library | Active & validated |
| **Vanilla CSS** | Design tokens & design system | Active & validated (`tokens.css` + `index.css`) |
| **ESLint 9** | Code quality & static analysis | Active & validated (`npm run lint` passes) |
| **Prettier 3** | Code formatting | Active & validated (`npm run format:check` passes) |
| **Supabase Client** | Official browser DB/Auth client | Active & validated (`@supabase/supabase-js`) |
| **Node.js Fastify** | Backend REST API | Active & validated in `backend/` |
| **Sharp** | Image decoding & RGBA normalization | Active & validated (`sharp` in `backend/`) |
| **jsQR** | Deterministic bit-matrix QR decoding | Active & validated (`jsqr` in `backend/`) |
| **Vitest** | Automated backend unit testing | Active & validated (`vitest` in `backend/`) |
| **Supabase Server SDK** | Backend registry adapter & service client | Active & validated (`@supabase/supabase-js` in `backend/`) |
| **Supabase PostgreSQL** | Database persistence & RLS | Active & reachable (Schema & read-adapter connected) |
| **Supabase Auth** | Merchant authentication | Foundation active (Auth UI in Phase 1) |
| **Supabase Storage** | Reference image vault | Not configured yet (Planned: Phase 3) |
| **Google Gemini API** | Contextual explanation layer | Not configured yet (Planned: Phase 8) |

---

## 5. Environment State

| Environment Variable / Service | Status | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Configured locally / Template | Defined in `.env.example`; defaults to `http://localhost:3000` |
| `VITE_SUPABASE_URL` | Configured locally | Loaded from `frontend/.env.local` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Configured locally | Loaded from `frontend/.env.local` (Client-safe publishable key) |
| `VITE_APP_ENV` | Configured locally | Defaults to `development` |
| `SUPABASE_URL` | Configured locally | Loaded from `backend/.env` (Backend registry target) |
| `SUPABASE_SECRET_KEY` | Configured locally | Loaded from `backend/.env` (Backend server secret; strictly gitignored) |
| `GEMINI_API_KEY` | Not configured | Backend-only secret; never exposed to browser |

*Security Confirmation*: Zero actual API keys or secrets exist in the repository or git history.

---

## 6. Verified Tests

The following checks and validations were executed locally and passed with zero errors:

1. **Dependency Installation**: `npm i lucide-react` completed cleanly (exit code 0).
2. **TypeScript Compilation & Build**: `npm run build` (`tsc -b && vite build`) completed with exit code 0 (`dist/` compiled cleanly: 1929 modules transformed, 264.46 kB bundle).
3. **Linting Check**: `npm run lint` (`eslint .`) completed with exit code 0 (zero errors, zero warnings).
4. **Code Formatting Check**: `npm run format:check` (`prettier --check "src/**/*.{ts,tsx,css}"`) completed with exit code 0 (all files use Prettier style).
5. **Route Navigation & Future Flags Verification**: Verified routes (`/`, `/verify`, `/dashboard`, `/invalid-route`). Zero React Router warnings captured. 404 handler verified.
6. **Dashboard UI Verification**: Confirmed absence of unimplemented action buttons (`Export Audit Logs`, `Register Destination`, `Add VPA`, `Upload Asset`) and confirmed updated session wording (`"Authentication not configured"`, `"Merchant profile not connected"`).

---

## 7. Known Issues

None.

---

## 8. Decisions Made

1. **Future Flags Opt-In**: Configured `v7_relativeSplatPath: true` in `createBrowserRouter` and `v7_startTransition: true` in `RouterProvider` to eliminate future deprecation warnings in React Router v6.
2. **Honest Workspace UI**: Removed buttons that implied active capabilities before backend implementation.
3. **Factual Foundation Wording**: Replaced speculative "Session Active" status with explicit "Authentication not configured".

---

## 9. Next Task

**Phase 1**: Supabase Auth Integration & Merchant Session Management.

---

## 10. Rules for Future AI Agents

1. **Read `memory.md` First**: Always read this document at the start of any new session or sub-task to anchor context in actual reality rather than hypothetical assumptions.
2. **Preserve Design System**: All future components must utilize tokens from `tokens.css` and primitives from `src/components/`.
3. **Never Invent Completed Features or Metrics**: Do not mock fake backend endpoints, fake accuracy percentages, fake customer testimonials, or fake banking connections.
4. **Update `memory.md` After Significant Milestones**: At the completion of each major phase or sub-phase, update this file to reflect the new state of the repository, verified tests, and next tasks.
5. **Zero Secret Storage**: Never write real credentials, API keys, or private tokens to code, documentation, or git history.
