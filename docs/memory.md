# QRShield AI — Project Memory

Status: ACTIVE
Current Phase: Phase 11 — Deployment Preparation & Production Infrastructure
Current Sub-Phase: Prompt 024-RLS-FIX Complete (Live Merchant Profile Insert RLS Fix & Strict Session Derivation)

Last Updated: 2026-10-05

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
- **Prompt 018 Gemini Explanation Layer (`backend/src/integrations/gemini/`)**:
  - Implemented the Gemini Explanation Layer converting structured deterministic evidence into neutral, user-readable explanations.
  - Architectural Invariant: Gemini is strictly an explanatory layer and NEVER decides or overrides the canonical verification status. `verification_status` remains strictly anchored to `CompositeVerificationResult.status`.
  - SDK: Official `@google/genai` (v2.27.0). Deprecated SDKs (`@google/generative-ai`) and external tools/grounding (search, maps, URLs) are forbidden.
  - Model: `gemini-3.8-flash`.
  - Backend-Only Secret Boundary: `GEMINI_API_KEY` loaded exclusively in backend environment; optional on startup without throwing; never exposed to frontend, never logged, never returned in API payloads.
  - Strict Prompt Template & Injection Defense (`prompt.ts`): Delimits untrusted evidence inside `<verification_evidence>` tags, escapes closing XML tags in untrusted data, and provides authoritative system instructions prohibiting changing status, inventing evidence, claiming fraud, or soliciting credentials (PIN, OTP, CVV, password).
  - Structured Output & Sanitization (`gateway.ts`): Enforces JSON schema (`summary`, `key_findings`, `action`), strips HTML/scripts, validates consistency against canonical status, rejects forbidden terms ("guaranteed safe", "scam detected"), and rejects model outputs attempting to introduce a `status` field.
  - Authoritative Deterministic Fallback (`fallback.ts`): Provides factual, non-accusatory fallback text for all 5 canonical statuses (`VERIFIED`, `DESTINATION_MISMATCH`, `UNVERIFIED`, `SUSPICIOUS`, `INSUFFICIENT_EVIDENCE`).
  - Timeout & Resilience: 5000 ms timeout window; on timeout, API 503, quota errors, unconfigured key, or malformed JSON, seamlessly returns deterministic fallback with `provider: "deterministic_fallback"` and `model: null` without failing the request or throwing HTTP 500.
  - API Response Contract: Extended `POST /api/v1/verify` response with `explanation_metadata: { provider: 'gemini' | 'deterministic_fallback', model: 'gemini-3.8-flash' | null }`.
  - ESM Type-Only Exports: Fixed `AlignmentClassification`, `TamperAnalysisErrorCode`, and other type re-exports across `tamper-analysis` and `composite-verification` using `export type` syntax.
  - Automated Tests: 25 new tests added (21 in `gateway.test.ts`, 4 in `verify.test.ts`). Total backend test count: 202 passed across 9 suites with mocked Gemini boundary.
  - Live Verification Checks: Executed live diagnostics and confirmed `VERIFIED` and `DESTINATION_MISMATCH` against real Supabase registry with canonical statuses fully preserved.
  - **Prompt 019 Frontend → Live Verification API Integration (`frontend/src/`)**:
  - Implemented typed API client (`frontend/src/lib/api.ts`) for `POST /api/v1/verify` targeting `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).
  - Architecture invariants strictly maintained:
    - Frontend communicates exclusively with the backend API (`/api/v1/verify`).
    - Frontend contains ZERO backend secrets (no `GEMINI_API_KEY`, no `SUPABASE_SECRET_KEY`).
    - Frontend performs NO QR decoding, NO payment payload parsing, NO registry queries, and NO Gemini API calls.
    - Frontend treats backend `verification_status` as completely authoritative.
    - Zero permanent scan storage introduced; no Supabase storage upload from the browser.
  - API Client implementation:
    - Validates file presence, empty files, file size (<= 10MB), and image MIME types (`image/png`, `image/jpeg`, `image/webp`).
    - Constructs `multipart/form-data` with exact field name `image` and optional `merchant_id`.
    - Does NOT manually set `Content-Type` header (lets browser construct multipart boundary).
    - Custom error hierarchy (`ApiClientError`) capturing backend HTTP status, machine error codes (`code`), and recovery hints (`hint`).
  - Verify Page Integration (`frontend/src/pages/VerifyPage.tsx`):
    - Connected `FileDropzone` directly to `verifyQr`.
    - Supports optional manual entry of `merchant_id` without hardcoding test merchants in production UI.
    - Handles loading states (`dropzoneState="processing"`, `LoadingState` with accessible label, buttons disabled to prevent duplicate submissions).
    - Handles error states with `Alert` variant `error`, machine code, recovery message, and retry handler.
    - Renders returned verification result faithfully: canonical `StatusBadge` (`VERIFIED`, `DESTINATION_MISMATCH`, `UNVERIFIED`, `SUSPICIOUS`, `INSUFFICIENT_EVIDENCE`), decoded payload, destination parity, registered destination, image quality classifications, machine-readable risk factor tags, and neutral Gemini/deterministic explanation.
    - Added "Clear" / Reset action restoring clean idle state.
  - Fastify CORS Encapsulation Fix (`backend/src/plugins/security.ts`):
    - Wrapped `securityPlugin` with `fastify-plugin` (`fp`) to prevent Fastify scope encapsulation from dropping CORS headers on sibling routes (`/api/v1/verify`, `/api/v1/health`), enabling browser cross-origin requests from `http://localhost:5173`.
  - Testing & Quality Verification:
    - Configured Vitest + JSDOM for frontend (`frontend/vitest.config.ts`).
    - 7 unit tests for API client (`frontend/src/lib/api.test.ts`).
    - 8 integration tests for `VerifyPage` (`frontend/src/pages/VerifyPage.test.tsx`) covering all 5 canonical statuses, error alerts, and inflight duplicate submission prevention.
    - 15 frontend tests passing cleanly.
    - Frontend `npm run lint`, `npm run format:check`, and `npm run build` all pass with zero errors.
    - Backend `npm run build`, `npm run lint`, `npm run format:check`, and all 202 backend tests across 9 suites pass with zero regressions.
    - Real local end-to-end integration verified via live HTTP POST from `http://localhost:5173` origin returning HTTP 200 with `VERIFIED` and `DESTINATION_MISMATCH` canonical states against live backend and Supabase registry.

- **Prompt 020 Real Merchant Authentication, Dashboard, and Trusted Destination Registration (`frontend/`)**:
  - Implemented real Supabase Auth session management and state layer (`frontend/src/context/AuthContext.tsx`):
    - Reactive `onAuthStateChange` listener managing session, user, profile, and payment destinations.
    - Full authentication methods: `signIn(email, password)`, `signUp(email, password)`, `signOut()`.
    - Protected session initialization ensuring no flickering of unauthenticated states during initial load.
  - Implemented Authentication UI (`frontend/src/pages/AuthPage.tsx`):
    - Clean Sign In and Sign Up views with toggle action.
    - Controlled email, password, and confirm password fields with deterministic client-side validation.
    - Visible error alerts for invalid credentials, weak passwords, and password mismatches.
    - Zero custom password tables; credentials owned strictly by Supabase Auth.
  - Implemented Route Guard & Navigation (`frontend/src/components/ProtectedRoute.tsx`, `frontend/src/app/router.tsx`):
    - Protected `/dashboard` route redirecting unauthenticated users to `/login`.
    - Preserved public routes (`/`, `/verify`, `*`).
    - Added auth-aware navigation in `Header.tsx` displaying merchant identity, direct sign-out action, and sign-in link.
  - Implemented Protected Merchant Dashboard (`frontend/src/pages/DashboardPage.tsx`):
    - Authenticated user's merchant profile and trusted destinations loaded strictly under RLS policies (`auth.uid() = user_id`).
    - Merchant Onboarding state: prompts new authenticated users to register business name when no profile exists; prevents duplicate profile creation.
    - Trusted Destination Registration & Management: registers destinations (`VPA`, `URL`, `ACCOUNT`) in `payment_destinations` table associated with merchant ID; provides in-place active/inactive toggling.
    - Honest empty states for reference QR storage (Phase 3) and verification audit history (Phase 10) with zero fake metrics or fake testimonials.
    - Verified context helper in `VerifyPage.tsx` allowing signed-in merchants to populate their merchant ID for local testing without breaking anonymous verification or hardcoding test UUIDs.
  - Security & RLS Compliance (`frontend/src/security.test.ts`):
    - Verified zero hard-coded demo merchant UUIDs (`51bc512c-7945-4404-bd24-4316ce924daa`) in frontend production source code.
    - Verified zero backend secrets or Supabase service role keys (`SUPABASE_SECRET_KEY`) present in frontend source.
  - Automated Tests: Added 14 new frontend tests (2 in `security.test.ts`, 4 in `AuthPage.test.tsx`, 8 in `DashboardPage.test.tsx`). Total frontend test suite: 29 tests passing across 5 test suites.
  - Verified full 14-step live Supabase manual flow against real Supabase instance: confirmed sign-in, profile insertion under RLS, destination registration, destination toggle, reload persistence, unauthenticated RLS query prevention (0 records returned), and persistent re-authentication.

- **Prompt 021 Reference QR Storage + Real Physical Tamper Verification (`backend/`, `frontend/`)**:
  - Implemented secure, private reference QR storage in Supabase Storage (`reference-qrs` bucket) and PostgreSQL `reference_qrs` table.
  - Storage & Security Architecture:
    - Dedicated private bucket `reference-qrs` (`public: false`). Zero public URLs are created or exposed.
    - Deterministic ownership path: `${merchantId}/reference-qr-${timestamp}.${ext}` preventing merchant collisions.
    - Short-lived signed preview URLs (`createSignedUrl(..., 300)`) generated on demand for authenticated merchant dashboard preview.
    - Zero service-role credentials exposed to the frontend; backend handles trusted storage retrieval.
  - Deterministic Reference Validation:
    - Pre-upload and pre-storage validation rejects zero-byte files, unsupported MIME types (allowed: `image/png`, `image/jpeg`, `image/webp`), oversized files (> 10MB), and invalid image buffers.
    - Deterministic QR detection (`decodeQr`) verifies candidate image contains a readable QR and extracts finder coordinates before storage.
    - Rejects QR-less or unreadable images with explicit error: *"Reference QR could not be established. Upload a clear QR image."*
  - Atomic Registration & Partial-Failure Cleanup:
    - Single active reference QR per merchant model.
    - On replacement: validates new image, uploads new object, persists database record in `reference_qrs` with SHA-256 payload hash and finder coordinates, and cleans up old storage objects and prior active records.
    - If database metadata persistence fails, newly uploaded storage object is automatically cleaned up to prevent orphaned assets.
  - Endpoints Implemented (`backend/src/routes/reference-qr.ts`):
    - `GET /api/v1/merchants/:merchantId/reference-qr`: Returns active reference QR record with fresh signed preview URL (expires in 300s) or `null`.
    - `POST /api/v1/merchants/:merchantId/reference-qr`: Multipart image upload; executes quality check, storage upload, DB upsert, and returns HTTP 201 Created with metadata and signed preview URL.
    - `DELETE /api/v1/merchants/:merchantId/reference-qr`: Deactivates/removes active reference QR record from DB and deletes backing storage file.
  - Backend Verification Pipeline Tamper Integration (`backend/src/routes/verify.ts`):
    - When merchant context is supplied (`merchant_id`), pipeline resolves merchant's active reference QR from `reference_qrs` table.
    - Downloads private reference image bytes from Supabase Storage `reference-qrs` bucket.
    - Runs existing deterministic `analyzeQrVisualDifference(candidateBuffer, referenceBuffer)`.
    - Feeds `tamperResult` into `composeVerificationResult(destinationResult, imageQualityResult, tamperResult)`.
    - If no reference QR is registered, pipeline continues destination verification normally with `tamper.available = false` and does NOT invent a suspicious score.
    - Preserves canonical composite status precedence: `DESTINATION_MISMATCH` > `SUSPICIOUS` > `VERIFIED`.
    - Extends `/api/v1/verify` response with factual structured tamper evidence (`visual_deviation_index`, `alignment_classification`, `boundary_anomaly_score`, `structural_difference`, `matrix_mismatch_ratio`, `analysis_quality`, `tamper_indicators`) without exposing raw files or public URLs.
    - Gemini remains downstream of deterministic evidence: receives structured tamper metrics for neutral explanation; never receives private reference image bytes, never decides canonical status.
  - Merchant Dashboard UI (`frontend/src/pages/DashboardPage.tsx`):
    - Added 3-component Trust Posture Summary bar (Merchant Profile, Trusted Destination, Reference QR) providing immediate understanding of baseline posture.
    - Replaced placeholder Section 3 with active Reference QR management card: displays registration status, short-lived signed image preview, decoded payload hash, upload timestamp, replacement dropzone, and remove/deactivate action.
  - Verify Console Integration (`frontend/src/pages/VerifyPage.tsx`):
    - Context helper indicates reference QR registration status for selected merchant.
    - Section E (Visual Evidence) displays physical comparison status (`AVAILABLE` vs `NOT AVAILABLE — merchant has no registered reference QR`) and exposes factual tamper metrics (`visual_deviation_index`, `alignment_classification`, `matrix_mismatch_ratio`, `boundary_anomaly_score`, `tamper_indicators`).
  - Automated Tests:
    - Added 20 new backend tests in `backend/src/routes/reference-qr.test.ts` covering valid upload, unsupported types, zero-byte files, oversized files, invalid bytes, QR-less images, replacement cleanup, upload failure handling, database failure rollback, merchant isolation, tamper analysis execution, identical match (`VERIFIED`), tampered match (`SUSPICIOUS`), destination mismatch precedence (`DESTINATION_MISMATCH`), and Gemini override prevention.
    - Total backend tests: 222 passed across 10 test suites (zero regressions on baseline 202 tests).
    - Total frontend tests: 29 passed across 5 test suites.
  - Real Live Supabase Manual Test (Part 19):
    - Executed live automated diagnostic script `backend/src/scripts/live-p21-test.ts` against real Supabase instance:
      1. Verified merchant profile `79a836e0-68e1-4b00-a122-eadef81eb068` (Apex Retailers Ltd).
      2. Uploaded real generated official reference QR image (`upi://pay?pa=apexretail@icici...`).
      3. Confirmed Storage upload to private `reference-qrs` bucket and record in `reference_qrs` table.
      4. Confirmed reload with signed preview URL generation.
      5. Verified reference-equivalent candidate image returned `VERIFIED`, `tamper.available: true`, `visual_deviation_index: 0`.
      6. Verified visually modified candidate image returned real tamper metrics (`visual_deviation_index: 0.0068`).
      7. Verified attacker QR with mismatched destination returned `DESTINATION_MISMATCH` authoritatively.
      8. Confirmed anonymous access to private storage object was blocked/denied.
      9. Cleanly deleted test reference QR and verified database count returned to 0.

### Not Completed (Explicitly Pending Future Phases)
- Merchant Admin Registry Endpoints (Phase 3 remaining)
- Calibrated Risk Engine (Phase 7)
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

Completed **Prompt 021 (Reference QR Storage + Real Physical Tamper Verification)**. Ready for next phase.


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
| **Supabase Storage** | Reference image vault | Active & validated (Private `reference-qrs` bucket) |
| **Google Gemini API** | Contextual explanation layer | Active & validated (`@google/genai` in `backend/`) |
| **Vitest (Frontend)** | Frontend unit & component testing | Active & validated (`vitest`, `@testing-library/react` in `frontend/`) |

---

## 5. Environment State

| Environment Variable / Service | Status | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Configured locally | Configured in `frontend/.env.local`; `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Configured locally | Loaded from `frontend/.env.local` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Configured locally | Loaded from `frontend/.env.local` (Client-safe publishable key) |
| `VITE_APP_ENV` | Configured locally | Defaults to `development` |
| `SUPABASE_URL` | Configured locally | Loaded from `backend/.env` (Backend registry target) |
| `SUPABASE_SECRET_KEY` | Configured locally | Loaded from `backend/.env` (Backend server secret; strictly gitignored) |
| `GEMINI_API_KEY` | Configured locally | Backend-only secret; strictly loaded in `backend/.env` |

*Security Confirmation*: Zero actual API keys or secrets exist in git-tracked files or repository history.

---

## 6. Verified Tests

The following checks and validations were executed locally and passed with zero errors:

1. **Frontend Vitest Test Suite**: `npm test` (`vitest run`) in `frontend/` passed all 29 tests across 5 suites (`src/security.test.ts`, `src/lib/api.test.ts`, `src/pages/AuthPage.test.tsx`, `src/pages/VerifyPage.test.tsx`, `src/pages/DashboardPage.test.tsx`).
2. **Frontend TypeScript Compilation & Build**: `npm run build` (`tsc -b && vite build`) completed with exit code 0 (`dist/` compiled cleanly: 1980 modules transformed).
3. **Frontend Linting Check**: `npm run lint` (`eslint .`) completed with exit code 0 (zero errors, zero warnings).
4. **Frontend Code Formatting Check**: `npm run format:check` (`prettier --check "src/**/*.{ts,tsx,css}"`) completed with exit code 0.
5. **Backend Vitest Test Suite**: `npm test` (`vitest run`) in `backend/` passed all 222 tests across 10 test suites with zero regressions (including 202 baseline regression tests and 20 new tests in `reference-qr.test.ts`).
6. **Backend TypeScript Compilation & Build**: `npm run build` (`tsc`) completed with exit code 0.
7. **Backend Linting & Formatting Check**: `npm run lint` and `npm run format:check` completed with exit code 0.
8. **Real Local End-to-End CORS & API Check**: Tested live HTTP POST request with `Origin: http://localhost:5173` to `http://localhost:8000/api/v1/verify` with real QR payload and test merchant ID: confirmed HTTP 200, CORS headers, `VERIFIED` and `DESTINATION_MISMATCH` canonical states against live Supabase registry.
9. **Genuine Manual Supabase Verification (Prompt 020)**: Executed live integration with Supabase Auth and PostgreSQL tables under RLS: confirmed user sign-in, onboarding profile registration under `auth.uid() = user_id`, trusted payment destination insertion (`VPA`), destination active state update, reload persistence, unauthenticated query rejection (0 records returned), and clean re-authentication.
10. **Prompt 021 Live Supabase Manual Test (Part 19)**: Executed live automated diagnostic script `backend/src/scripts/live-p21-test.ts` against live Supabase:
    - Official reference QR generation and upload to `POST /api/v1/merchants/:merchantId/reference-qr` -> HTTP 201 Created.
    - Verified storage object creation in private `reference-qrs` bucket and metadata in `reference_qrs` table.
    - Verified short-lived signed preview URL generation (valid for 300 seconds).
    - Verified identical reference QR candidate verification produced `VERIFIED` with `tamper.available = true`, `visual_deviation_index = 0`, `alignment_classification = GOOD`.
    - Verified visually modified candidate QR produced real visual deviation metrics (`visual_deviation_index = 0.0068`).
    - Verified attacker QR with mismatched destination produced canonical status `DESTINATION_MISMATCH` authoritatively.
    - Verified anonymous download attempt on private `reference-qrs` storage bucket was rejected.
    - Verified clean deactivation and removal via `DELETE /api/v1/merchants/:merchantId/reference-qr`.

  - **Prompt 021A — Critical Security Fix: Reference QR BOLA/IDOR Authorization**:
    - **Vulnerability Discovered**: The initial Prompt 021 Reference QR endpoints (`GET`, `POST`, `DELETE` at `/api/v1/merchants/:merchantId/reference-qr`) relied on the privileged server-side Supabase client (`supabaseServer`) without validating caller identity or merchant profile ownership. A caller could modify `:merchantId` in the URL to inspect, overwrite, or delete another merchant's reference QR baseline (Broken Object Level Authorization / IDOR).
    - **Authentication Fix**: Implemented strict bearer token authentication across all reference QR endpoints (`GET`, `POST`, `DELETE`). The bearer token is extracted from the `Authorization: Bearer <token>` header and validated via `supabaseServer.auth.getUser(token)`. Missing, empty, malformed, or invalid tokens immediately reject with HTTP 401 `E_UNAUTHORIZED`. Tokens are never decoded client-side or accepted via query parameters.
    - **Merchant Ownership Authorization**: Added strict profile ownership validation before any privileged DB or Storage operation. The system resolves the merchant record by `:merchantId` via the service-role client, verifies that the merchant exists (returning HTTP 404 `E_MERCHANT_NOT_FOUND` if absent), and compares `merchant.user_id === authenticatedUser.id`. If the merchant belongs to another user, the request immediately terminates with HTTP 403 `E_FORBIDDEN` and safe message `"Caller does not own this merchant profile."` with zero detail leakage.
    - **Privileged Client Safety**: Ownership authorization occurs strictly *before* any privileged operations (reading records, generating signed preview URLs, running QR decoder/tamper pipelines, uploading storage objects, or deleting existing files). Unauthorized requests produce zero storage and zero database mutations.
    - **Backend Authorization Tests**: Added 20 automated authorization test cases (tests 22–41 in `backend/src/routes/reference-qr.test.ts`).
    - **Frontend Security Tests**: Added automated security tests (tests 21–26 in `frontend/src/security.test.ts` and `frontend/src/lib/api.test.ts`) proving that reference API calls send the `Authorization` header, no Supabase service-role keys are exposed in the frontend bundle, and no hardcoded merchant UUIDs exist in frontend source.
    - **Manual Security Validation**: Executed `backend/src/scripts/live-security-check.ts` against real live Supabase instances with harmless test accounts. Validated that User A accessing Merchant A succeeded (HTTP 200), User A attempting to access Merchant B returned HTTP 403 `E_FORBIDDEN`, unauthorized requests returned HTTP 401 `E_UNAUTHORIZED`, and Merchant B's database records and private Storage files remained 100% untouched.

  - **Prompt 022 — Real Sample Lab + Evaluator-Ready End-to-End Test Cases**:
    - **Architecture & Design Principles**:
      - Implemented a public-safe, reproducible **Sample Lab** providing real evaluator test cases without hard-coded result cards, synthetic metrics, or fake counters.
      - Architectural flow: Evaluator selects a real test specimen → UI loads the actual PNG file → calls the authoritative `POST /api/v1/verify` endpoint → backend performs full decoding, registry lookup, camera quality gating, and homographic projective tamper analysis → UI renders the measured verdict and evidence breakdown.
      - Expected statuses are strictly treated as QA assertions and benchmark metadata; the UI displays only the live measured output from the backend verification pipeline.
    - **Sample Catalog & Manifest (`sample-data/`)**:
      - `sample-data/manifest.json`: Single source of truth defining all 5 canonical specimens, including ID, name, canonical category, expected status, test payload, creation method, public storage URL, local API streaming endpoint, and merchant context requirements.
      - `sample-data/images/`: 6 deterministic physical PNG assets generated via `qrcode` and `sharp`:
        1. `sample-01-verified.png`: Authentic QR matching registered destination (`pa=qrshield-sample@icici`) and reference baseline.
        2. `sample-02-mismatch.png`: Attacker QR with unauthorized destination (`pa=attacker-sample@upi`) evaluated against registered merchant context.
        3. `sample-03-unverified.png`: Unanchored payment destination (`pa=unregistered-sample@upi`) evaluated without merchant context.
        4. `sample-04-suspicious.png`: Valid payment destination (`pa=qrshield-sample@icici`) composited with a 340x340 px rectangular boundary cutline in the quiet zone that triggers `boundaryAnomalyDetected = true` (score 0.604) in the physical tamper analysis engine while remaining decodable.
        5. `sample-05-insufficient.png`: Degraded photograph downsampled to 140x140 px, underexposed to 0.18 mean brightness, and blurred via Gaussian filter (sigma 0.8), triggering `image_quality.overall_quality = INSUFFICIENT`.
        6. `reference-baseline.png`: Pristine baseline reference QR stored exclusively in the private `reference-qrs` storage bucket for merchant `51bc512c-7945-4404-bd24-4316ce924daa`.
    - **Backend Routes (`backend/src/routes/samples.ts`)**:
      - `GET /api/v1/samples`: Read-only catalog endpoint returning all 5 sample definitions.
      - `GET /api/v1/samples/:sampleId`: Single sample detail endpoint.
      - `GET /api/v1/samples/:sampleId/image`: Streams the physical sample PNG directly with `Content-Type: image/png` and caching headers, enabling offline and local verification.
    - **Validation Runner (`npm run sample:validate`)**:
      - Created `backend/src/scripts/validate-samples.ts` executing all 5 specimens through `POST /api/v1/verify`.
      - Compares measured status against expected status. Exits 0 on 100% pass, non-zero on any divergence.
      - All 5 samples passed with 100% fidelity:
        - `Official Registered Merchant QR`: Expected `VERIFIED` → Actual `VERIFIED`
        - `Replaced QR Code (Destination Mismatch)`: Expected `DESTINATION_MISMATCH` → Actual `DESTINATION_MISMATCH`
        - `Unregistered Merchant Destination`: Expected `UNVERIFIED` → Actual `UNVERIFIED`
        - `Physical Sticker / Border Tampering`: Expected `SUSPICIOUS` → Actual `SUSPICIOUS`
        - `Degraded Camera Capture`: Expected `INSUFFICIENT_EVIDENCE` → Actual `INSUFFICIENT_EVIDENCE`
    - **Evaluator Frontend (`frontend/src/pages/SampleLabPage.tsx`)**:
      - Built interactive Sample Lab conforming to the dark obsidian/slate design system.
      - Features specimen selector with category badges and QA benchmark tags, physical image preview, embedded test payload, creation details, and a primary "Run Real Verification" button.
      - Real-time live execution state and structured evidence display: Live Status, QA Assertion banner, Destination Parity analysis, Image Quality metrics, Physical Tamper metrics, Gemini / Fallback explanation, and duration telemetry.
      - Integrated into navigation bar (`NAV_LINKS`) and router (`/sample-lab`).
    - **Security & Storage Isolation**:
      - Public synthetic assets reside in the public `sample-lab` bucket in Supabase (`https://uivcrkcbhidsgyfbezju.supabase.co/storage/v1/object/public/sample-lab/`).
      - Verified that all sample URLs return HTTP 200 publicly.
      - Verified that private merchant reference QRs remain strictly protected in the private `reference-qrs` bucket (HTTP 400/403 on unauthenticated access).
      - Zero secret keys, zero private banking credentials, and zero hard-coded merchant UUIDs in frontend production code.

  - **Prompt 023 — Full QA + Security + Performance Hardening**:
    - **Resource Exhaustion Hardening**:
      - Added decompression/pixel-bomb protections in `backend/src/modules/qr-decoder/decoder.ts`, `backend/src/modules/image-quality/analyzer.ts`, and `backend/src/modules/image-quality/rules.ts`.
      - Enforced maximum dimension limit `MAX_IMAGE_DIMENSION = 4096` px and maximum pixel area `MAX_IMAGE_PIXELS = 16_777_216` px directly in Sharp metadata pre-flight inspection before decoding or allocating uncompressed raw pixel memory.
      - Pathological dimensions are immediately rejected with `InvalidImageError` (`E_INVALID_IMAGE`) or `ImageTooLargeError` (`E_IMAGE_TOO_LARGE`).
    - **API Route Security & Input Validation**:
      - `POST /api/v1/verify`: Enforced strict `isSafeMerchantId` UUID validation (with mock prefix support under test mode) on the multipart `merchant_id` field. Conflicting duplicate `merchant_id` fields are rejected with HTTP 400 `E_AMBIGUOUS_MERCHANT_ID`. Error messaging uses dynamic safe error strings instead of static strings.
      - `GET /api/v1/samples`: Cached the manifest in-memory (`cachedManifest`) to eliminate repeated filesystem I/O.
      - `GET /api/v1/samples/:sampleId` & `GET /api/v1/samples/:sampleId/image`: Added strict regex validation on `:sampleId` (`^[a-zA-Z0-9_-]+$`) rejecting malformed IDs with HTTP 400 `E_INVALID_SAMPLE_ID`. Added directory jail validation (`path.resolve(imagesDir, sample.image_file).startsWith(imagesDir + path.sep)`) preventing directory traversal attacks. Standardized error shapes to `{ error: { code, message } }`.
    - **Reference QR BOLA/IDOR Hardening**:
      - Re-audited Prompt 021/021A bearer auth and merchant ownership checks across GET, POST, DELETE at `/api/v1/merchants/:merchantId/reference-qr`. Confirmed all mutations occur strictly after ownership verification; storage objects are private; signed URLs are ephemeral (300s TTL).
    - **Gemini Boundary & Resilience**:
      - Verified Gemini remains explanation-only. Tested timeout resilience: if Gemini takes longer than 4000ms or fails, the verification pipeline immediately falls back to deterministic rule-based explanations in <300ms without modifying canonical status. Contradictory model outputs are refused and canonical status is preserved.
    - **Deterministic Performance Benchmark Suite (`backend/src/scripts/benchmark.ts`)**:
      - Created deterministic benchmark measuring 50 iterations for visual analysis and 500 iterations for CPU logic:
        - 1. QR Decoding (`decodeQr`): Mean 18.48ms | Median 16.89ms | p95 31.16ms
        - 2. Image Quality (`analyzeImageQuality`): Mean 16.79ms | Median 16.39ms | p95 22.49ms
        - 3. Tamper Analysis (`analyzeQrVisualDifference`): Mean 69.32ms | Median 68.27ms | p95 86.70ms
        - 4. Registry Lookup (`verifyDestination`): Mean 0.00ms (<0.03ms)
        - 5. Composite Engine (`composeVerificationResult`): Mean 0.00ms (<0.05ms)
        - Total Deterministic Pipeline Mean: **~104.59 ms**.
      - Added `"benchmark": "tsx src/scripts/benchmark.ts"` script to `backend/package.json`.
    - **Automated Hardening & Edge Test Suite (`backend/src/routes/hardening.test.ts`)**:
      - Implemented 18 comprehensive regression tests verifying multipart handling, missing/empty image payloads, unsupported MIME types, corrupted bytes, duplicate files, malformed/SQL injection merchant IDs, blank image no-QR, dimension limits (4097px rejection), sample path traversal, 404 unknown samples, mock Gemini timeout fallback (<300ms), and contradictory model output refusal.
    - **Frontend Bundle Security Check (`frontend/src/security.test.ts`)**:
      - Added test 27 verifying the built `frontend/dist/assets/*.js` contains zero backend secrets (`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `service_role`).
    - **Live Security Validation**:
      - Executed against live Supabase: verified IDOR protection (403 Forbidden on foreign merchant), unauthorized access (401 Unauthorized), non-existent merchant (404 Not Found), owner access (200 OK), and zero DB/Storage mutations on foreign tenant.
    - **Verified Tests**:
      - Frontend Vitest: 46 / 46 passed across 6 test files.
      - Backend Vitest: 277 / 277 passed across 12 test files.
      - Sample Validation: 5 / 5 passed (VERIFIED, DESTINATION_MISMATCH, UNVERIFIED, SUSPICIOUS, INSUFFICIENT_EVIDENCE).
      - Frontend Build, Lint, Format: 0 errors, 0 warnings.
      - Backend Build, Lint, Format: 0 errors, 0 warnings.

  - **Prompt 024 & 024-FIX — Deployment Preparation & Render Production Build Fix**:
    - **Render Production Build Failure Root Cause**:
      - Render builds execute in production mode (`npm ci && npm run build`), which omits `devDependencies` such as `vitest`, `qrcode`, and `@types/qrcode`.
      - Previously, `backend/tsconfig.json` included `src/**/*`, causing `tsc` to type-check and compile all test files (`src/**/*.test.ts`) and developer/diagnostic scripts (`src/scripts/**`).
      - This produced missing module errors (`Cannot find module 'vitest'`, `Cannot find module 'qrcode'`) during Render deployment.
    - **Production TypeScript Separation (`backend/tsconfig.build.json`)**:
      - Created dedicated production configuration extending base `tsconfig.json`.
      - Explicitly excludes `src/**/*.test.ts`, `src/**/*.test.tsx`, and `src/scripts/**`.
      - Emits strictly runtime artifacts to `dist/`, including `dist/server.js`, `dist/app.js`, modules, integrations, and plugins.
      - Updated `backend/package.json` build script to: `"build": "tsc -p tsconfig.build.json"`.
    - **Dependency Classification Audit**:
      - Verified `qrcode`, `@types/qrcode`, and `vitest` are strictly development dependencies; zero production runtime code imports them.
      - All runtime dependencies (`@fastify/cors`, `@fastify/helmet`, `@fastify/multipart`, `@google/genai`, `@supabase/supabase-js`, `fastify`, `fastify-plugin`, `jsqr`, `sharp`) reside in `dependencies`.
    - **Production Simulation Validation**:
      - Simulated an isolated production installation with `vitest`, `qrcode`, and `@types/qrcode` completely absent from `node_modules`.
      - Confirmed `npm run build` (`tsc -p tsconfig.build.json`) succeeds with exit code 0, emitting clean `dist/server.js` without test or script artifacts.
    - **Frontend Vercel Configuration**:
      - Added `frontend/vercel.json` with SPA routing rewrites (`/(.*) -> /index.html`) ensuring direct navigation and refresh on `/verify`, `/dashboard`, `/sample-lab`, and `/login` resolve correctly without 404s.
      - Standardized `.env.example` across root, frontend, and backend documenting `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL`, and Render configuration requirements (`PORT`, `HOST=0.0.0.0`, `ALLOWED_ORIGINS`).

  - **Prompt 024-RLS-FIX — Live Merchant Profile Insert Failure & Strict Session Derivation**:
    - **Exact Root Cause Identified**:
      - The PostgreSQL RLS policy on the `merchants` table enforces strict tenant ownership: `WITH CHECK (auth.uid() = user_id)`.
      - Previously, `createMerchantProfile` in `frontend/src/context/AuthContext.tsx` derived `user_id` from local React component state (`user.id`) rather than authoritatively inspecting the active Supabase session at insert time.
      - Additionally, `signUp` previously set `user` state to non-null even when `session` was `null` (such as before email verification), enabling unauthenticated/unconfirmed users to navigate to `/dashboard`.
      - When an insert was attempted without a verified active session token, PostgREST executed the mutation under the `anon` role (`auth.uid() = NULL`), causing the RLS check (`auth.uid() = user_id`) to evaluate to `NULL = user_id` (falsy), triggering PostgreSQL error `42501: new row violates row-level security policy for table "merchants"`.
    - **Database RLS Policy Audit & Verification**:
      - Inspected the live PostgreSQL `merchants` table schema: `id` (uuid, PK), `user_id` (uuid, unique, FK), `business_name` (text, not null), `registration_number` (text), `contact_email` (text), `created_at` (timestamptz).
      - Confirmed the database RLS policies strictly enforce ownership across all operations:
        - `SELECT`: `auth.uid() = user_id`
        - `INSERT`: `auth.uid() = user_id`
        - `UPDATE`: `auth.uid() = user_id`
        - `DELETE`: `auth.uid() = user_id`
      - Documented the authoritative, minimal SQL definition in `migrations/001_merchants_rls.sql`.
    - **Frontend Fixes Implemented**:
      - `AuthContext.tsx`: `createMerchantProfile` now calls `await supabase.auth.getSession()` at insert time, verifies `activeSession?.user?.id`, and derives `user_id = activeSession.user.id` strictly from the verified session. Unauthenticated or expired callers fail fast with `'Cannot create merchant profile: No active authenticated Supabase session.'` before making an unauthenticated database request.
      - `AuthContext.tsx`: `signUp` now sets `setUser(data.session ? data.user : null)`, preventing unconfirmed sign-up flows from granting pseudo-authenticated state.
      - `ProtectedRoute.tsx`: Now strictly checks `if (!user || !session)` to guarantee that only authenticated callers with active JWT tokens can access `/dashboard`.
    - **Automated Regression Test Suite**:
      - `frontend/src/context/AuthContext.test.tsx`: 3 unit tests proving session user_id derivation, rejection of unauthenticated inserts, and prevention of pseudo-authentication during unconfirmed sign-up.
      - `frontend/src/security.test.ts`: Added tests 28–30 asserting AST/source patterns for session derivation, `ProtectedRoute` dual check, and `signUp` session gating (52 frontend tests passing).
      - `backend/src/scripts/validate-merchants-rls.ts`: Automated live test against hosted Supabase verifying:
        1. Authenticated user creates own merchant profile (`user_id === session.user.id`) -> SUCCESS.
        2. Signed-out anon client cannot insert -> 42501 error.
        3. Authenticated user cannot insert for another user -> 42501 error.
        4. Tenant isolation confirmed intact (0 rows readable/updatable/deletable on foreign tenant).
        5. Dashboard refresh and persistence confirmed.
    - **Live Account Verification (`meekosampranav@gmail.com`)**:
      - Authenticated live user `meekosampranav@gmail.com` (`7e182d46-3912-433a-81b7-470b06cb7d66`).
      - Confirmed live insert succeeded with `user_id = 7e182d46-3912-433a-81b7-470b06cb7d66`.
      - Confirmed persistence on reload and clean teardown.

---

## 7. Known Issues & Limitations

1. **Physical Lighting & Perspective Limitations**: The deterministic tamper analyzer utilizes geometric alignment via corner finding and homography. Extremely skewed (angle > 45°) or severely shadowed/occluded physical scans may result in low alignment quality or `INSUFFICIENT_EVIDENCE` from the image quality analyzer before visual tamper analysis executes.
2. **Reference QR Decodability Prerequisite**: A reference QR must contain a readable, well-formed QR code so its finder patterns and baseline payload hash can be extracted. Degraded or blurry images cannot be registered as reference baselines.
3. **Synthetic Test Payloads**: All Sample Lab specimens utilize harmless synthetic payment handles (e.g. `qrshield-sample@icici`, `attacker-sample@upi`) to demonstrate attack vectors and defenses without exposing real financial data.
4. **No Financial Guarantee Implied**: Registering a reference QR establishes a physical appearance baseline only. It does not certify legal ownership of the underlying bank account or guarantee payment settlement.
5. **Upstream Gemini Availability**: Upstream Gemini capacity limits or 503 errors trigger deterministic fallback seamlessly, ensuring canonical verification verdicts and latency remain completely unaffected.

---

## 8. Decisions Made

1. **Future Flags Opt-In**: Configured `v7_relativeSplatPath: true` in `createBrowserRouter` and `v7_startTransition: true` in `RouterProvider` to eliminate future deprecation warnings in React Router v6.
2. **Honest Workspace UI**: Removed buttons that implied active capabilities before backend implementation.
3. **Factual Foundation Wording**: Replaced speculative "Session Active" status with explicit "Authentication not configured".
4. **Client-Side Auth & RLS Model**: Client queries use the standard Supabase anonymous/publishable key; access control and tenant isolation are enforced strictly by PostgreSQL RLS (`auth.uid() = user_id`). No Supabase secret or service-role keys are exposed to the frontend.
5. **Private Storage & Short-Lived Signed URLs**: Reference QR images are stored in a private bucket (`reference-qrs`). Signed preview URLs are created on-demand with a 300-second TTL exclusively for authenticated merchant dashboard preview. No permanent or public URLs are generated.
6. **Public Sample Lab Storage**: The `sample-lab` bucket is intentionally public for evaluator access to harmless synthetic test vectors, while `reference-qrs` remains strictly private.
7. **No Synthetic Result Cards**: The Sample Lab always executes the real backend endpoint (`POST /api/v1/verify`) and displays the actual server response. Expected statuses serve exclusively as QA benchmarks.
8. **Resource Exhaustion Limits**: Enforced 4096px dimension and 16.7M pixel limits on all incoming image processing buffers before raw pixel decompression.
9. **Strict Parameter Validation & Directory Jailing**: Merchant IDs are strictly validated to UUID format, conflicting duplicate multipart fields are rejected with HTTP 400, and Sample Lab image streaming enforces directory jail boundaries against path traversal.
10. **Automated Bundle Security Verification**: Frontend build assets are tested automatically to guarantee zero secret leakage into static client bundles.
11. **Production TypeScript Build Isolation**: Used `tsconfig.build.json` to isolate production builds from development tests and scripts, enabling zero-failure deployments on platforms like Render where devDependencies are pruned.

---

## 9. Next Task

**Phase 11 / Prompt 025**: Live Deployment Execution (Render Web Service backend deploy, Vercel frontend deploy, and live cross-origin verification against hosted Supabase).

---

## 10. Rules for Future AI Agents

1. **Read `memory.md` First**: Always read this document at the start of any new session or sub-task to anchor context in actual reality rather than hypothetical assumptions.
2. **Preserve Design System**: All future components must utilize tokens from `tokens.css` and primitives from `src/components/`.
3. **Never Invent Completed Features or Metrics**: Do not mock fake backend endpoints, fake accuracy percentages, fake customer testimonials, or fake banking connections.
4. **Update `memory.md` After Significant Milestones**: At the completion of each major phase or sub-phase, update this file to reflect the new state of the repository, verified tests, and next tasks.
5. **Zero Secret Storage**: Never write real credentials, API keys, or private tokens to code, documentation, or git history.
