# QRShield AI

> Physical QR Tamper & Payment Destination Verification System

---

## 1. Project Overview

QRShield AI is a verification-assistance system designed to determine whether a photographed or uploaded payment QR code matches an authentic registered merchant destination, and whether physical sticker-overlay tampering or payload redirection has occurred.

**Core Verification Mechanism**:
Verification is performed strictly by comparing a scanned payment destination (e.g. UPI VPA or URL) against an authenticated merchant profile and reference image stored in the trusted registry. 

**Critical Boundary**:
QRShield does not have direct access to private banking networks, does not independently discover legal bank account owners behind UPI IDs, and does not process payments. It operates strictly as an explainable verification tool.

---

## 2. Current Status & Phase

- **Project Status**: Foundation Stage
- **Current Phase**: **Phase 0 — Project Foundation**
- **Implemented in this Phase**: Repository scaffolding, strict TypeScript/ESLint/Prettier toolchain, client-side routing shell, and build pipeline.
- **Unfinished Functionality (Planned / Not Implemented Yet)**:
  - Phase 1: Authentication *(Planned)*
  - Phase 2: Complete Dashboard Shell *(Planned)*
  - Phase 3: Trusted Merchant & QR Registration *(Planned)*
  - Phase 4: QR Upload & Deterministic Decoding *(Planned)*
  - Phase 5: Payment Destination Verification *(Planned)*
  - Phase 6: Physical Tamper / Reference Comparison *(Planned)*
  - Phase 7: Risk Engine *(Planned)*
  - Phase 8: Gemini Explanation Layer *(Planned)*
  - Phase 9: Sample Lab *(Planned)*
  - Phase 10: Verification History *(Planned)*
  - Phase 11: Testing & Benchmark Suite *(Planned)*
  - Phase 12: Security Hardening *(Planned)*
  - Phase 13: Production Preparation *(Planned)*
  - Phase 14: Cloud Deployment *(Planned)*
  - Phase 15: Custom Domain & Legal *(Planned)*
  - Phase 16: Final Evaluator Testing *(Planned)*

---

## 3. Technology Stack

### Active (Foundation)
- **Frontend Framework**: React 18+
- **Language**: TypeScript (strict mode enabled)
- **Build Tooling**: Vite
- **Routing**: React Router v6
- **Code Quality**: ESLint 9 (Flat Config), Prettier
- **Package Manager**: npm

### Planned (Future Phases)
- **Backend API**: Node.js + TypeScript + Fastify *(Planned - Render)*
- **Database & Auth**: Supabase PostgreSQL + Supabase Auth *(Planned)*
- **Storage**: Supabase Storage (`reference-qrs`, `scan-evidence`, `sample-lab`) *(Planned)*
- **AI Explanation Layer**: Google Gemini API via official SDK *(Planned - Backend-only)*

---

## 4. Repository Structure

```
QR-Shield/
├── docs/                      # Architectural, design, and requirement specifications
│   ├── architecture.md
│   ├── design.md
│   ├── phases.md
│   ├── project-requirements.md
│   └── rules.md
├── frontend/                  # React + TypeScript + Vite single-page application
│   ├── public/                # Static public assets
│   ├── src/
│   │   ├── app/               # Routing and application-level providers
│   │   ├── components/        # Reusable UI primitives (Header, Footer, Button, etc.)
│   │   ├── features/          # Feature-specific modules (Planned)
│   │   ├── layouts/           # Structural page layouts (RootLayout)
│   │   ├── lib/               # Shared constants and configurations
│   │   ├── pages/             # Page components (Home, Verify, Dashboard, NotFound)
│   │   ├── services/          # API service interfaces (Planned)
│   │   ├── styles/            # Design tokens, reset, and base stylesheet
│   │   ├── types/             # TypeScript type definitions and status enums
│   │   ├── utils/             # Helper utility functions
│   │   ├── App.tsx            # Root application component
│   │   └── main.tsx           # Application entrypoint
│   ├── eslint.config.js       # ESLint configuration
│   ├── index.html             # Application HTML shell
│   ├── package.json           # Frontend dependencies and scripts
│   ├── tsconfig.json          # TypeScript compiler configuration (strict)
│   └── vite.config.ts         # Vite bundler configuration
├── backend/                   # Node.js + Fastify service (Planned)
├── sample-data/               # Curated test specimens for Sample Lab (Planned)
├── tests/                     # Integration and benchmark test harness (Planned)
├── .env.example               # Safe environment variable template
├── .gitignore                 # Version control exclusions
└── README.md                  # Project documentation
```

---

## 5. Local Development Setup

### Prerequisites
- Node.js (v18.0.0 or higher recommended, tested on v24.x)
- npm (v9.0.0 or higher, tested on v11.x)

### Installation
1. Clone the repository and navigate into the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server
Start the local Vite development server:
   ```bash
   npm run dev
   ```
The application will be accessible at `http://localhost:5173`.

### Production Build & Validation
To compile the production bundle and run type-checking:
   ```bash
   npm run build
   ```

To run lint checks:
   ```bash
   npm run lint
   ```

To run code formatting checks:
   ```bash
   npm run format:check
   ```

---

## 6. Environment Variables

Client-side environment variables are declared in `.env.example`. 

To configure your local environment:
1. Copy `.env.example` into `frontend/.env.local`:
   ```bash
   cp .env.example frontend/.env.local
   ```
2. Populate the required values:
   - `VITE_API_BASE_URL`: Base URL for the backend API service (defaults to `http://localhost:3000` in dev).
   - `VITE_SUPABASE_URL`: Public Supabase project URL.
   - `VITE_SUPABASE_ANON_KEY`: Public anonymous Supabase key (client-safe).
   - `VITE_APP_ENV`: Environment designation (`development` | `staging` | `production`).

---

## 7. Planned Deployment Architecture

```
Client Browser
     │ (HTTPS / TLS 1.3)
     ▼
Vercel Edge Network ───> Frontend (React + Vite SPA)
     │
     │ (HTTPS REST API)
     ▼
Render Web Service ────> Backend API (Node.js + Fastify)
     │
     ├───> Supabase Cloud (PostgreSQL, Auth, Storage)
     └───> Google AI Studio (Gemini API - Backend Only)
```

---

## 8. Security & Secret Management

- **Zero Secret Exposure**: Server-side secrets (such as `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY`) must **never** be added to frontend code or frontend environment variables.
- **Git Hygiene**: Real `.env`, `.env.local`, and credential files are strictly excluded via `.gitignore`. Never commit API keys or production secrets to this repository.
