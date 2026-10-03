# QRShield AI — Project Memory

Status: ACTIVE  
Current Phase: Phase 0 — Project Foundation  
Current Sub-Phase: Foundation & UI Toolchain Validation  
Last Updated: 2026-10-04  

---

## 1. Completed

The following items and components have been implemented, verified, and pushed to the repository:

- **Project Documentation Foundation**:
  - `docs/project-requirements.md`: Threat vector, canonical statuses, 16 MVP capabilities, evaluation framework, and acceptance criteria.
  - `docs/architecture.md`: Multi-tier system architecture, trust model, locked technology stack, and API contract.
  - `docs/rules.md`: Strict coding standards, security, secrets governance, WCAG AA accessibility, and 18 visual design restrictions.
  - `docs/phases.md`: 17 gated development phases (Phase 0 to Phase 16).
  - `docs/design.md`: Color tokens (Dark Obsidian/Slate foundation), Inter & JetBrains Mono typography scale, 8pt spacing grid, and component rules.
- **Git & Repository Initialization**:
  - Clean GitHub synchronization (`main` branch tracked and pushed).
  - Root `.gitignore` properly excluding `node_modules/`, `dist/`, `.env*`, and cache artifacts.
  - Root `.env.example` with safe configuration placeholders.
  - Root `README.md` documenting architecture, local setup, and phase progression.
  - Root placeholder folders with `.gitkeep`: `backend/`, `sample-data/`, `tests/`.
- **Frontend Toolchain & Shell (React + TypeScript + Vite)**:
  - Initialized in `frontend/` using Node.js v24 and npm v11.
  - Strict TypeScript compiler configuration (`tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/vite-env.d.ts`).
  - ESLint 9 (Flat Config via `eslint.config.js`) configured with zero warnings.
  - Prettier formatting rules configured (`.prettierrc`) with 100% check pass.
  - React Router v6 integrated with foundational client-side routes (`/`, `/verify`, `/dashboard`, `*`).
  - Application Error Boundary (`src/app/ErrorBoundary.tsx`) for graceful runtime exception handling.
  - Responsive layout shell (`RootLayout`, `Header`, `Footer`, `Button`, `StatusBadge`).
  - Validated production bundle compilation (`npm run build`) and lint verification (`npm run lint`).

### Not Completed (Explicitly Pending Future Phases)
- Authentication (Phase 1 — Supabase Auth)
- Dashboard Shell Finalization (Phase 2)
- Trusted Merchant & Payment Destination Registry (Phase 3)
- QR Upload & Deterministic Decoding (Phase 4)
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
- Custom Domain, Favicon & Legal Compliance (Phase 15)
- Final Evaluator Walkthrough (Phase 16)

---

## 2. Currently Working On

Transitioning from initial toolchain validation into building the **production-quality QRShield design system and interface foundation** (design tokens, layout containers, accessible controls, responsive viewport shells) in preparation for Phase 1 Authentication and Phase 2 Dashboard Shell.

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
│   └── .gitkeep
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
        │   ├── Button.tsx
        │   ├── Footer.tsx
        │   ├── Header.tsx
        │   └── StatusBadge.tsx
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
| **React Router 6** | Client-side routing | Active & validated (`/`, `/verify`, `/dashboard`) |
| **ESLint 9** | Code quality & static analysis | Active & validated (`npm run lint` passes) |
| **Prettier 3** | Code formatting | Active & validated (`npm run format:check` passes) |
| **Node.js Fastify** | Backend REST API | Planned (Target: Render in Phase 4/5) |
| **Supabase PostgreSQL** | Database persistence & RLS | Not configured yet (Planned: Phase 1/3) |
| **Supabase Auth** | Merchant authentication | Not configured yet (Planned: Phase 1) |
| **Supabase Storage** | Reference image vault | Not configured yet (Planned: Phase 3) |
| **Google Gemini API** | Contextual explanation layer | Not configured yet (Planned: Phase 8) |

---

## 5. Environment State

| Environment Variable / Service | Status | Notes |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | Configured locally / Template | Defined in `.env.example`; defaults to `http://localhost:3000` |
| `VITE_SUPABASE_URL` | Not configured | Placeholder in `.env.example`; requires Supabase project |
| `VITE_SUPABASE_ANON_KEY` | Not configured | Placeholder in `.env.example`; client-safe public key |
| `VITE_APP_ENV` | Configured locally | Defaults to `development` |
| `SUPABASE_SERVICE_ROLE_KEY` | Not configured | Backend-only secret; never exposed to browser |
| `GEMINI_API_KEY` | Not configured | Backend-only secret; never exposed to browser |

*Security Confirmation*: Zero actual API keys or secrets exist in the repository or git history.

---

## 6. Verified Tests

The following checks and validations were executed locally and passed with zero errors:

1. **Dependency Installation**: `npm install` completed with exit code 0.
2. **TypeScript Typecheck & Build**: `tsc -b && vite build` completed with exit code 0 (`dist/` compiled cleanly: 43 modules, 229 kB bundle).
3. **Linting Check**: `eslint .` completed with exit code 0 (zero errors, zero warnings).
4. **Code Formatting Check**: `prettier --check "src/**/*.{ts,tsx,css}"` completed with exit code 0 (all files matched code style).
5. **Route Navigation Verification**: Routes `/`, `/verify`, `/dashboard`, and `*` (404) verified via React Router DOM tree.

---

## 7. Known Issues

1. **Render CV Stack Dependency**: While backend is locked to Node.js + Fastify with Sharp, visual difference comparison for distorted smartphone camera photos in Phase 6 will require careful calibration of lightweight diff algorithms against real samples.
2. **Merchant Identification in Direct Uploads**: When an unindexed or altered QR code is scanned without providing an expected merchant identifier, the system must deterministically flag `UNVERIFIED` unless contextual merchant matching (e.g. location tag or merchant ID parameter) is supplied.

---

## 8. Decisions Made

1. **Frontend Stack**: Locked to **React + TypeScript + Vite** with **React Router** deployed to Vercel as a single-page application.
2. **Backend Stack**: Locked to **Node.js + TypeScript + Fastify** deployed to Render as a dedicated REST API service.
3. **Trust Model**: QRShield strictly verifies scanned payment destinations against a **pre-registered trusted merchant profile**. The system does **not** claim direct core banking access, account holder lookup, or real-time banking transaction clearance.
4. **Deterministic vs. Generative Boundary**: QR decoding, destination string comparison, and risk scoring are **100% deterministic**. The Google Gemini API is situated strictly behind the backend to synthesize plain-language explanations and assess visual context; it is prohibited from altering canonical verification statuses.
5. **Canonical Statuses**: Strictly standardized to 5 states:
   - `VERIFIED`
   - `DESTINATION_MISMATCH`
   - `UNVERIFIED`
   - `SUSPICIOUS`
   - `INSUFFICIENT_EVIDENCE`
6. **Visual Standards**: Utilitarian, cybersecurity/fintech console aesthetic based on Dark Obsidian/Slate (`#0B0F17`, `#111827`, `#182234`). Absolute prohibition on purple gradients, emoji icons, fake reviews, AI-generated human photos, and fake accuracy claims.

---

## 9. Next Task

**Task**: Implement the production-grade QRShield design system tokens, typography hierarchy, accessible input/card primitives, and comprehensive responsive UI shell in accordance with [docs/design.md](file:///c:/Users/prana/OneDrive/Desktop/Hackathon/QR-Shield/docs/design.md).

---

## 10. Rules for Future AI Agents

1. **Read `memory.md` First**: Always read this document at the start of any new session or sub-task to anchor context in actual reality rather than hypothetical assumptions.
2. **Consult Project Docs Before Architectural Changes**: Never alter core design, architecture, or phase progression without consulting `docs/architecture.md`, `docs/project-requirements.md`, and `docs/rules.md`.
3. **Never Assume Unfinished Work is Complete**: Only rely on modules and services listed in Section 1 (Completed). Treat all items listed under "Not Completed" as pending implementation.
4. **Never Invent Completed Features or Metrics**: Do not mock fake backend endpoints, fake accuracy percentages, fake customer testimonials, or fake banking connections.
5. **Update `memory.md` After Significant Milestones**: At the completion of each major phase or sub-phase, update this file to reflect the new state of the repository, verified tests, and next tasks.
6. **Zero Secret Storage**: Never write real credentials, API keys, or private tokens to code, documentation, or git history.
