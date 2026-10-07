# QRShield AI

> Physical QR Tamper & Payment Destination Verification System

[![Frontend Tests](https://img.shields.io/badge/Frontend%20Tests-52%20passed-blue)](#test-coverage--validation)
[![Backend Tests](https://img.shields.io/badge/Backend%20Tests-277%20passed-blue)](#test-coverage--validation)
[![Sample Lab](https://img.shields.io/badge/Sample%20Lab-5%2F5%20validated-success)](#sample-lab)

---

## 1. Live Deployments

| Component | Target / Environment | URL |
| :--- | :--- | :--- |
| **Live Web Console** | Vercel (Edge CDN) | [qr-shield-seven.vercel.app](https://qr-shield-seven.vercel.app/) |
| **Verification Console** | Vercel | [qr-shield-seven.vercel.app/verify](https://qr-shield-seven.vercel.app/verify) |
| **Evaluator Sample Lab** | Vercel | [qr-shield-seven.vercel.app/sample-lab](https://qr-shield-seven.vercel.app/sample-lab) |
| **Merchant Dashboard** | Vercel (Protected Route) | [qr-shield-seven.vercel.app/dashboard](https://qr-shield-seven.vercel.app/dashboard) |
| **Merchant Auth / Login** | Vercel | [qr-shield-seven.vercel.app/login](https://qr-shield-seven.vercel.app/login) |
| **Backend REST API** | Render Web Service | [qrshield-backend-elj6.onrender.com](https://qrshield-backend-elj6.onrender.com) |
| **Health Endpoint** | Render | [qrshield-backend-elj6.onrender.com/api/v1/health](https://qrshield-backend-elj6.onrender.com/api/v1/health) |
| **Source Repository** | GitHub | [github.com/ReddyJahnaviDevarinti/QR-Shield](https://github.com/ReddyJahnaviDevarinti/QR-Shield) |

---

## 2. Project Overview & Core Trust Model

**QRShield AI** is an evidence-based verification-assistance system designed to detect payment destination tampering, unauthorized payload redirects, and physical sticker overlay tampering on payment QR codes (e.g., UPI QR codes).

### Evidence-Based Evaluation
Rather than guessing or applying opaque probabilistic classifiers to payment risk, QRShield evaluates candidate payment QR codes against four concrete layers of evidence:

1. **Trusted Registered Payment Destination**: Resolves whether the scanned destination (e.g. UPI Virtual Payment Address or URL) matches an active, authorized destination registered by the merchant.
2. **Physical QR Reference Asset (When Available)**: Compares the candidate scan against the merchant's registered physical baseline QR using deterministic homographic alignment.
3. **Deterministic Image Quality Evidence**: Measures photographic capture quality (exposure, contrast, Laplacian sharpness, resolution, dynamic range) before evaluating downstream tamper indicators.
4. **Deterministic Physical Tamper Evidence**: Detects boundary anomalies, matrix structure disparities, and sticker overlay cutlines.

### Core Trust Equation

$$\text{Merchant Identity} + \text{Trusted Payment Destination} + \text{Registered Physical Reference QR} = \text{QRShield Trust Baseline}$$

### The Deterministic Boundary vs. LLM Explanation Layer
- **Canonical Decision**: Canonical statuses (`VERIFIED`, `DESTINATION_MISMATCH`, `UNVERIFIED`, `SUSPICIOUS`, `INSUFFICIENT_EVIDENCE`) are generated exclusively by deterministic CPU and database evaluation rules.
- **Gemini Role**: Google Gemini (`gemini-3.8-flash`) acts strictly as a downstream natural-language explanation layer. It synthesizes structured, machine-readable evidence into neutral, non-accusatory customer summaries.
- **Fail-Safe Invariant**: Gemini **never** assigns, overrides, or alters the canonical verification status. If Gemini times out, experiences rate limits, or fails schema validation, the system falls back seamlessly to deterministic, rule-based text explanations.

---

## 3. Canonical Verification Statuses

QRShield produces one of five mutually exclusive canonical verdicts. It strictly avoids sensationalist or legally loaded terminology such as "fake QR", "fraud guaranteed", or "scam confirmed".

| Canonical Status | Meaning & Criteria | Operational Implication |
| :--- | :--- | :--- |
| **`VERIFIED`** | Scanned destination matches an active trusted merchant destination, image quality is acceptable, and no physical tamper indicators are detected. | Scanned payment destination matches the merchant's verified baseline. |
| **`DESTINATION_MISMATCH`** | Scanned destination conflicts with the active trusted destination registered for the specified merchant context. | Scanned code redirects to an unauthorized third-party destination. Take caution. |
| **`UNVERIFIED`** | Payment destination is well-formed, but has no active matching registration in the trusted registry (or scan was submitted without merchant context). | Destination is unanchored in registry. Does not inherently indicate fraud. |
| **`SUSPICIOUS`** | Destination matches registered destination, but visual comparison against the registered Reference QR reveals significant visual anomalies (e.g. sticker cutlines, boundary discontinuities). | Potential physical overlay tampering detected. Manual physical inspection recommended. |
| **`INSUFFICIENT_EVIDENCE`** | Image quality is degraded (extreme blur, underexposure, glare, low resolution) preventing reliable matrix decoding or tamper analysis. | Verification cannot be completed reliably. User is prompted to recapture a clearer image. |

*Notice: `UNVERIFIED` does not mean fraudulent; it indicates the absence of an anchored registration. QRShield does not verify underlying bank account ownership.*

---

## 4. End-to-End Verification Pipeline

Every scan submitted to `POST /api/v1/verify` traverses a 12-step deterministic pipeline:

```
[Uploaded QR Image]
       │
       ▼
 1. Multipart & Ingestion Validation (MIME check, 10MB limit, 4096px dimension limit)
       │
       ▼
 2. In-Memory QR Matrix Decoding (Sharp RGB normalization + jsQR)
       │
       ▼
 3. Deterministic Payment Parsing (Extract & normalize UPI pa, pn, am, mc or URL)
       │
       ▼
 4. Destination Normalization (Trimming, percent-decoding, VPA canonical lowercasing)
       │
       ▼
 5. Trusted Registry Lookup (Supabase PostgreSQL query under active merchant context)
       │
       ▼
 6. Deterministic Destination Verification (Exact normalized string comparison)
       │
       ▼
 7. Image Quality Analysis (Sharp: brightness, contrast, 2D Laplacian sharpness)
       │
       ▼
 8. Reference QR Retrieval (Private Supabase Storage fetch if merchant has active reference)
       │
       ▼
 9. Homographic Tamper Analysis (Projective warping to canonical 256x256, Otsu threshold, Sobel cutline detection)
       │
       ▼
10. Composite Verification Engine (Determines authoritative canonical status: VERIFIED | MISMATCH | UNVERIFIED | SUSPICIOUS | INSUFFICIENT)
       │
       ▼
11. Explanation Layer (Gemini 3.8 Flash converts evidence to summary; fallback on failure)
       │
       ▼
12. Structured JSON API Response (Delivered to client with UUID & measured duration)
```

---

## 5. Evaluator Sample Lab

The **Sample Lab** ([qr-shield-seven.vercel.app/sample-lab](https://qr-shield-seven.vercel.app/sample-lab)) provides five reproducible, synthetic specimens. When an evaluator selects a sample, the web client fetches the actual physical PNG and invokes the live backend API (`POST /api/v1/verify`).

The UI displays the measured verdict, quality metrics, and tamper indices emitted by the server.

| Specimen Name | Visual Profile | Scanned Destination | Anchor Baseline | Measured Status |
| :--- | :--- | :--- | :--- | :--- |
| **Official Registered Merchant QR** | Crisp 400x400 physical capture | `pa=qrshield-sample@icici` | Registered (`qrshield-sample@icici`) | `VERIFIED` |
| **Replaced QR Code** | Crisp 400x400 candidate | `pa=attacker-sample@upi` | Registered (`qrshield-sample@icici`) | `DESTINATION_MISMATCH` |
| **Unregistered Merchant Destination** | Authentic-looking standalone code | `pa=unregistered-sample@upi` | None (Public / Anonymous) | `UNVERIFIED` |
| **Physical Sticker / Border Tampering** | Decodable QR with border overlay line | `pa=qrshield-sample@icici` | Registered Reference QR | `SUSPICIOUS` |
| **Degraded Camera Capture** | Gaussian blur, underexposed (0.18 mean) | `pa=qrshield-sample@icici` | Registered Reference QR | `INSUFFICIENT_EVIDENCE` |

*Notice: Sample Lab specimens are synthetic test vectors designed to demonstrate pipeline mechanics; they do not represent statistical real-world accuracy rates.*

---

## 6. Architecture & System Boundaries

```
┌────────────────────────────────────────────────────────┐
│                     Client Browser                     │
│  React 18 SPA + Vite + React Router + Context Auth     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Vercel Edge Network)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Vercel Deployment                    │
│  - Static SPA Hosting & Edge CDN                       │
│  - SPA Routing Rewrites (vercel.json)                  │
│  - Zero Backend Secrets in static bundles              │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS REST API
                            ▼
┌────────────────────────────────────────────────────────┐
│               Render Backend Web Service               │
│  - Fastify + TypeScript (Host 0.0.0.0, PORT bound)     │
│  - Security: Helmet, CORS Whitelist                    │
│  - Sharp + jsQR in-memory processing                   │
│  - Pure Deterministic Verification & Tamper Engines    │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌───────────────────────────────┐ ┌──────────────────────┐
│        Supabase Cloud         │ │  Google AI Studio    │
│  - Supabase Auth (JWT)        │ │  - Gemini 3.8 Flash  │
│  - PostgreSQL (Strict RLS)    │ │  - Structured JSON   │
│  - Private Storage:           │ │  - Backend-only key  │
│    `reference-qrs` (Private)  │ │  - Fallback engine   │
│    `sample-lab` (Public)      │ └──────────────────────┘
└───────────────────────────────┘
```

### Secret & Asset Isolation Invariants
- **Frontend Isolation**: The browser client bundle possesses **zero** access to `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `GEMINI_API_KEY`.
- **Private Storage**: Reference QR image baselines reside in the private `reference-qrs` bucket. Preview images require short-lived (300s TTL) signed URLs accessible only by the verified merchant owner.
- **Public Storage**: The `sample-lab` bucket contains exclusively synthetic, harmless test assets for public evaluation.

---

## 7. Technology Stack

### Frontend Application
- **Framework**: React 18+
- **Language**: TypeScript (strict compiler configuration)
- **Tooling**: Vite
- **Routing**: React Router v6 (SPA rewrites enabled)
- **Styling**: Vanilla CSS with centralized design tokens (`src/styles/tokens.css`, `index.css`)
- **Icons**: Lucide React
- **Test Runner**: Vitest + React Testing Library + JSDOM

### Backend Service
- **Runtime**: Node.js (v20+ / v24 compatible)
- **Framework**: Fastify v5
- **Plugins**: `@fastify/cors`, `@fastify/helmet`, `@fastify/multipart`
- **Language**: TypeScript (strict mode, dedicated `tsconfig.build.json` for production)
- **Test Runner**: Vitest

### Image & QR Processing
- **Matrix Decoding**: `jsqr`
- **Image Pipeline**: `sharp` (pixel normalization, EXIF rotation, grayscale reduction)
- **Tamper Engine**: Custom homographic projection warping (3x3 Heckbert matrix), Otsu thresholding, Sobel gradient edge discontinuity filter

### Database, Auth & Storage
- **Database**: PostgreSQL hosted on Supabase Cloud
- **Row-Level Security**: Enabled on all tables (`merchants`, `payment_destinations`, `reference_qrs`, `verification_logs`)
- **Authentication**: Supabase Auth (JWT bearer token authorization)
- **Object Storage**: Supabase Storage (`reference-qrs` private bucket, `sample-lab` public bucket)

### AI Explanation Layer
- **Model**: `gemini-3.8-flash` via official `@google/genai` SDK
- **Integration**: Backend-only, enclosed in prompt delimiter sanitization with JSON schema validation
- **Resilience**: 4000ms timeout with automatic deterministic fallback

---

## 8. Security Hardening Controls

| Security Vector | Implementation & Architecture Control |
| :--- | :--- |
| **Row-Level Security (RLS)** | All PostgreSQL tables enforce strict tenant ownership. Merchant mutations require `auth.uid() = user_id`. |
| **BOLA / IDOR Defense** | Reference QR management routes (`GET`, `POST`, `DELETE` at `/api/v1/merchants/:merchantId/reference-qr`) enforce bearer token validation and profile ownership matching (`merchant.user_id === authenticatedUser.id`) prior to any privileged database or storage operation. |
| **Resource Exhaustion Defense** | Image uploads are restricted to a maximum of 10 MB and pre-flight checked via Sharp metadata to enforce `MAX_IMAGE_DIMENSION = 4096 px` and `MAX_IMAGE_PIXELS = 16,777,216 px` before allocating raw pixel memory. |
| **Input & Traversal Defense** | Multipart fields enforce duplicate field rejection, UUID regex sanitization, and strict directory jail checks (`path.resolve()`) on sample asset access. |
| **Frontend Bundle Hygiene** | Automated CI assertions inspect production build assets in `dist/assets/*.js` to ensure zero backend secrets or service-role identifiers are bundled. |
| **Prompt Injection Defense** | Untrusted scan evidence passed to Gemini is enclosed inside `<verification_evidence>` delimiters with XML closing-tag escapes. System prompts prohibit modifying canonical verdicts. |
| **Graceful Degradation** | Gemini timeouts, rate limits, or network failures trigger deterministic fallback explanations in < 10 ms without leaking stack traces or altering the canonical status. |

---

## 9. Test Coverage & Validation

### Automated Test Suites

```
Frontend Vitest Suite:
✓ src/lib/api.test.ts (10 tests)
✓ src/security.test.ts (12 tests)
✓ src/context/AuthContext.test.tsx (3 tests)
✓ src/pages/SampleLabPage.test.tsx (7 tests)
✓ src/pages/AuthPage.test.tsx (4 tests)
✓ src/pages/VerifyPage.test.tsx (8 tests)
✓ src/pages/DashboardPage.test.tsx (8 tests)
Total Frontend: 52 / 52 PASSED

Backend Vitest Suite:
✓ src/modules/qr-decoder/decoder.test.ts (9 tests)
✓ src/modules/image-quality/analyzer.test.ts (22 tests)
✓ src/integrations/trusted-registry/repository.test.ts (19 tests)
✓ src/modules/payment-parser/parser.test.ts (16 tests)
✓ src/integrations/gemini/gateway.test.ts (21 tests)
✓ src/modules/composite-verification/engine.test.ts (34 tests)
✓ src/modules/verification-engine/engine.test.ts (18 tests)
✓ src/modules/tamper-analysis/analyzer.test.ts (25 tests)
✓ src/routes/hardening.test.ts (18 tests)
✓ src/routes/reference-qr.test.ts (41 tests)
✓ src/routes/verify.test.ts (38 tests)
✓ src/routes/samples.test.ts (16 tests)
Total Backend: 277 / 277 PASSED

Sample Lab CLI Validation:
✓ 5 / 5 samples verified against live backend pipeline (100% fidelity)
```

*Code Quality: Both frontend and backend compile cleanly with zero TypeScript errors, zero ESLint warnings, and 100% Prettier formatting compliance.*

### Benchmark Telemetry
Benchmarked locally over 500 iterations for CPU logic and 50 iterations for visual analysis (`npm run benchmark` in `backend`):

| Pipeline Stage | Mean Duration | Median Duration | p95 Duration |
| :--- | :--- | :--- | :--- |
| **QR Matrix Decoding** (`decodeQr`) | 18.48 ms | 16.89 ms | 31.16 ms |
| **Image Quality Analysis** (`analyzeImageQuality`) | 16.79 ms | 16.39 ms | 22.49 ms |
| **Physical Tamper Analysis** (`analyzeQrVisualDifference`) | 69.32 ms | 68.27 ms | 86.70 ms |
| **Registry Lookup** (`verifyDestination`) | < 0.03 ms | < 0.01 ms | < 0.05 ms |
| **Composite Decision Engine** (`composeVerificationResult`) | < 0.05 ms | < 0.01 ms | < 0.08 ms |
| **Total Deterministic Pipeline** | **~104.59 ms** | **~101.56 ms** | **~140.40 ms** |

*Notice: Telemetry reflects local deterministic pipeline execution. Upstream Gemini API response times vary by network conditions, falling back to deterministic explanations upon reaching the 4000ms timeout.*

---

## 10. Honest System Limitations

1. **Physical Capture Dependencies**: The homographic tamper analyzer relies on identifiable finder patterns. Severely skewed captures (angle > 45°), heavy motion blur, or intense glare will trip the image quality gate and yield `INSUFFICIENT_EVIDENCE`.
2. **Reference QR Requirement**: Physical visual tamper comparison is only possible if the merchant has registered an authoritative Reference QR baseline. In its absence, QRShield performs destination verification with `tamper.available = false`.
3. **No Bank-Core Access**: QRShield operates independently of banking switches and NPCI core ledgers. It cannot verify bank account balances, freeze accounts, or confirm legal bank account ownership beyond registered destinations.
4. **No Payment Processing**: QRShield is an advisory verification console. It does not execute or settle financial transactions.
5. **Synthetic Benchmarks**: Sample Lab payment identifiers (e.g. `qrshield-sample@icici`) are synthetic test fixtures and should not be construed as real-world statistical accuracy guarantees.
6. **Single Active Reference**: Each merchant profile currently maintains a single active Reference QR asset baseline.

---

## 11. Local Development Setup

### Prerequisites
- Node.js v20.x or higher
- npm v9.x or higher
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/ReddyJahnaviDevarinti/QR-Shield.git
cd QR-Shield
```

### 2. Configure Environment Files
Environment secrets must be supplied through local environment files and **never** committed to Git.

**Backend Configuration (`backend/.env`)**:
```env
PORT=8000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=your_supabase_secret_key
GEMINI_API_KEY=your_gemini_api_key
```

**Frontend Configuration (`frontend/.env.local`)**:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

### 3. Frontend Setup & Validation
```bash
cd frontend
npm install

# Start development server on http://localhost:5173
npm run dev

# Run automated test suite (52 tests)
npm test

# Run code quality checks & production build
npm run lint
npm run format:check
npm run build
```

### 4. Backend Setup & Validation
```bash
cd ../backend
npm install

# Start development server on http://localhost:8000
npm run dev

# Run automated test suite (277 tests)
npm test

# Validate Sample Lab specimens against pipeline
npm run sample:validate

# Run deterministic pipeline performance benchmark
npm run benchmark

# Compile production bundle
npm run build
```

---

## 12. Repository Structure

```
QR-Shield/
├── docs/                             # Architecture, requirements, design, and memory logs
│   ├── architecture.md               # Tier-by-tier architecture and system boundaries
│   ├── design.md                     # Token design system and component specifications
│   ├── memory.md                     # Living record of implemented engineering milestones
│   ├── phases.md                     # Development roadmap
│   ├── project-requirements.md       # Canonical verification requirements and rules
│   └── rules.md                      # Engineering invariants and coding standards
├── frontend/                         # React + TypeScript + Vite web application
│   ├── src/
│   │   ├── app/                      # Router configuration and error boundaries
│   │   ├── components/               # Accessible UI components (StatusBadge, Dropzone, etc.)
│   │   ├── context/                  # AuthContext with session ownership derivation
│   │   ├── lib/                      # API client, Supabase client, and constants
│   │   ├── pages/                    # Home, Verify, Dashboard, Auth, Sample Lab, NotFound
│   │   ├── styles/                   # Obsidian/slate tokens and CSS resets
│   │   └── types/                    # Frontend contracts and record definitions
│   ├── vercel.json                   # SPA routing rewrites for Vercel deployment
│   ├── vite.config.ts                # Bundler configuration
│   └── vitest.config.ts              # Frontend test configuration
├── backend/                          # Fastify + TypeScript verification REST API
│   ├── src/
│   │   ├── app.ts                    # Fastify application factory
│   │   ├── server.ts                 # Production server network listener
│   │   ├── config/                   # Typed environment configuration
│   │   ├── integrations/             # Supabase client, trusted registry, Gemini gateway
│   │   ├── modules/                  # Pure deterministic engines:
│   │   │   ├── qr-decoder/           # Sharp + jsQR matrix decoding
│   │   │   ├── payment-parser/       # UPI & URL payload parsing and normalization
│   │   │   ├── verification-engine/  # Deterministic destination verification
│   │   │   ├── image-quality/        # Sharp photographic quality gate
│   │   │   ├── tamper-analysis/      # Homographic alignment & cutline detection
│   │   │   └── composite-verification/# Authoritative canonical decision engine
│   │   ├── routes/                   # REST endpoints (health, verify, reference-qr, samples)
│   │   └── scripts/                  # Benchmarks, sample generation, live RLS validators
│   ├── tsconfig.json                 # Development TypeScript configuration
│   ├── tsconfig.build.json           # Isolated production build configuration
│   └── vitest.config.ts              # Backend test configuration
├── sample-data/                      # Curated synthetic test specimens
│   ├── images/                       # Physical test PNG assets
│   └── manifest.json                 # Canonical specimen catalog
├── migrations/                       # PostgreSQL schema and RLS migration scripts
│   └── 001_merchants_rls.sql         # Authoritative merchant RLS policies
├── tests/                            # Shared end-to-end integration test harnesses
├── .env.example                      # Template for environment variables
├── .gitignore                        # Git exclusion rules
└── README.md                         # Project documentation
```

---

## 13. Operational Disclaimer & Trust Notice

> **Operational Disclaimer**:
> QRShield AI is a verification-assistance tool designed to aid merchants and consumers in verifying payment QR codes against registered baselines. It **does not** connect directly to private banking ledgers, does not independently verify the legal identity of bank account owners behind payment handles, does not guarantee that a payment destination is free of financial risk, and does not process financial transactions. Users should exercise standard caution before completing payments.
