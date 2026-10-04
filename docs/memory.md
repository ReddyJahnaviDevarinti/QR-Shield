# QRShield AI — Project Memory

Status: ACTIVE
Current Phase: Phase 0 — Production Design System & UI Foundation
Current Sub-Phase: Prompt 006A UI Foundation QA Fixes Complete
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

### Not Completed (Explicitly Pending Future Phases)
- Authentication UI & Session Hooks (Phase 1 — Supabase Auth)
- Dashboard Shell & Backend Persistence Integration (Phase 2)
- Merchant & Payment Destination Registry Backend (Phase 3)
- Real QR Upload, Camera Capture & Deterministic Decoding (Phase 4)
- Payment Destination Verification Engine (Phase 5)
- Physical Tamper & Baseline Reference Comparison (Phase 6)
- Calibrated Risk Engine (Phase 7)
- Google Gemini Explanation Layer (Phase 8)
- Sample Lab Test Harness (Phase 9)
- Verification Audit History (Phase 10)
- Testing & Benchmark Suite (Phase 11)
- Security Hardening (Phase 12)
- Production Build Preparation (Phase 13)
- Cloud Deployment on Vercel & Render (Phase 14)
- Custom Domain, Favicon & Compliance (Phase 15)
- Final Evaluator Walkthrough (Phase 16)

---

## 2. Currently Working On

Completed **Prompt 008 (QRShield Backend Foundation)**. Ready to proceed with application features and Phase 1 integration.

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
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/
│       │   └── env.ts
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
| **Supabase PostgreSQL** | Database persistence & RLS | Active & reachable (Schema created) |
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
| `SUPABASE_SERVICE_ROLE_KEY` | Not configured | Backend-only secret; never exposed to browser |
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
