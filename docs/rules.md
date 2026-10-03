# Engineering Rules & Development Standards: QRShield AI

Status: DRAFT  
Last Updated: 2026-10-04  
Owner: QRShield Project  

---

## 1. Foundational Principles

QRShield AI is built as a serious, authoritative cybersecurity and payment verification system. Every line of code, documentation file, user interface component, and system output must reflect technical rigor, absolute truthfulness, and strict separation between deterministic verification facts and contextual generative interpretation.

---

## 2. Coding Standards & Software Engineering

1. **Strict Type Safety**:
   - TypeScript must run in `strict` mode with zero implicit `any` types.
   - If Python is used in the backend, type annotations (`typing`, `pydantic`) are mandatory on all functions, classes, and endpoint signatures.
2. **Deterministic Code Paths**:
   - Mathematical calculations, QR decoding, payload extraction, and destination matching must be 100% deterministic and unit-testable in isolation.
3. **Modularity & Single Responsibility**:
   - Components and service modules must not exceed 250 lines of code without architectural justification.
   - Decouple image decoding, database querying, risk evaluation, and AI reporting into distinct services.
4. **Code Quality Enforcement**:
   - Linting via ESLint/Prettier (JavaScript/TypeScript) or Ruff/Black (Python) must pass with zero warnings in CI pipelines.
   - No debugging statements (`console.log`, `debugger`, `print()`) may be committed to version control. Production-safe structured logging must be used instead.

---

## 3. Security & Cryptographic Standards

1. **Zero Financial Credential Collection**:
   - The application must never solicit, accept, transmit, or persist sensitive banking credentials (e.g., card numbers, CVVs, expiry dates, net banking passwords, or UPI PINs).
2. **Input Sanitization & Validation**:
   - Every incoming request payload (image files, text fields, search queries) must be validated against a formal schema (e.g. Zod or Pydantic).
   - All extracted QR text must be sanitized before rendering to eliminate Cross-Site Scripting (XSS) and injection vectors.
3. **CORS & Origin Restrictions**:
   - Backend APIs must reject any cross-origin request whose `Origin` header does not match approved development or production client domains.
4. **Rate Limiting & Abuse Defense**:
   - Verification endpoints must enforce rate limits (default: 30 requests/minute per IP address) to prevent scraping and denial-of-service abuse.
5. **No System Impersonation**:
   - The system must never spoof or pretend to be an official National Payments Corporation of India (NPCI) portal, central bank system, or commercial bank portal.

---

## 4. Secrets Management & API Keys

1. **Absolute Ban on Hardcoded Secrets**:
   - API keys, service role tokens, database connection strings, and private certificates must never appear in source code, documentation, git history, or client bundles.
2. **Environment Variable Segregation**:
   - Frontend variables must be strictly limited to public keys (`VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`).
   - Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) must reside exclusively in backend server environments (Render / local `.env`).
3. **Git Hygiene**:
   - `.env`, `.env.local`, `.env.production`, and key files must be tracked in `.gitignore`.
   - Any accidental secret commit requires immediate invalidation, rotation, and commit tree sanitization.

---

## 5. Database Access & Data Integrity

1. **Row Level Security (RLS) is Mandatory**:
   - Every PostgreSQL table created in Supabase must have RLS enabled immediately upon creation.
   - Tables containing merchant records, payment destinations, and reference photos must restrict mutations exclusively to the authenticated record owner.
2. **Principle of Least Privilege**:
   - The frontend must never utilize the Supabase `SERVICE_ROLE_KEY`.
   - Public consumer scans must write to verification logs via restricted RPCs or backend API endpoints with throttled insert privileges.
3. **Exact Destination Matching**:
   - Payment destination comparisons (VPA, domain, account number) must be performed with exact, canonicalized string equality.
   - Fuzzy or probabilistic matching must never be used to confirm that a destination is legitimate.

---

## 6. UI/UX Rules & Visual Prohibitions

The application interface must convey the gravitas of a production cybersecurity platform. It must be clean, utilitarian, high-contrast, and focused on verifiable evidence.

### 6.1 Explicit Prohibitions (DO NOT USE)
- ❌ **NO purple gradients** or neon-glow cyberpunk aesthetics.
- ❌ **NO generic AI landing page aesthetics** (e.g., floating bubbles, particle meshes, rainbow borders).
- ❌ **NO fake customer reviews** or synthetic user testimonials.
- ❌ **NO fake user counters** or artificial social proof tickers (e.g. *"Over 50,000 scans verified today"*).
- ❌ **NO fake statistics** or unverified accuracy figures.
- ❌ **NO emoji UI icons** (e.g. 🚀, 🛡️, ⚠️, 💰, 🤖) anywhere in the application interface or navigation.
- ❌ **NO AI-generated people photos**, stock business photography, or synthetic avatars.
- ❌ **NO AI-slop illustrations** (e.g. pastel vector people holding oversized smartphones).
- ❌ **NO vague hero copy** (e.g. *"Harness the power of next-gen AI to supercharge payment confidence"*).
- ❌ **NO exaggerated marketing claims** (e.g. *"100% impenetrable QR defense"*).
- ❌ **NO excessive glassmorphism** or multi-layered frosted glass effects.
- ❌ **NO excessive rounded cards** (limit border radii to standard tokens: 4px to 8px max).
- ❌ **NO unnecessary animations**, bouncing elements, or distraction-heavy loaders.
- ❌ **NO crazy scroll effects**, scroll-jacking, or horizontal snap parallax.
- ❌ **NO cursor-follow effects** or mouse trail shaders.
- ❌ **NO "Made with AI" labels** or celebratory AI branding.
- ❌ **NO fake trust badges**, unverified ISO certification emblems, or simulated security seals.
- ❌ **NO fake security claims** (e.g., *"Guaranteed military-grade protection"*).

### 6.2 Mandatory UI/UX Standards
- ✔️ **Information Hierarchy**: Critical status (VERIFIED, MISMATCH, SUSPICIOUS) must be immediately apparent with clear visual dominance.
- ✔️ **Iconography**: Use consistent, clean outline SVGs (e.g., Lucide or Feather icon set) sized at 16px, 20px, or 24px.
- ✔️ **Data Presentation**: Present extracted data, hashes, coordinates, and VPA strings in clean monospace tabular format.
- ✔️ **Restrained Motion**: Transitions must be functional and fast ($\le 200\text{ms}$ ease-out); respect `prefers-reduced-motion`.
- ✔️ **State Completeness**: Every screen and component must have explicit, visually refined states for:
  - *Initial / Idle*
  - *Active / Scanning*
  - *Loading / Processing*
  - *Empty State* (informative helper text with clear call to action)
  - *Error State* (diagnostic details with actionable remediation)

---

## 7. Content Quality & Ethical Communications

1. **Evidentiary Language Only**:
   - Report facts directly: *"Scanned VPA `merchant-fraud@upi` does not match registered VPA `merchant@upi` for ID #204."*
2. **Strict Prohibition of Defamatory Declarations**:
   - The system must never declare an individual or entity a *"fraudster"*, *"criminal"*, or *"scammer"*.
   - Statuses must remain strictly descriptive: `DESTINATION_MISMATCH`, `SUSPICIOUS`, `UNVERIFIED`.
3. **No Fabrication**:
   - Never invent mock fraud incidents, synthetic testimonials, or non-existent partnerships.
   - The Sample Lab must clearly label all demonstration specimens as `TEST_DATA / SYNTHETIC SPECIMEN`.

---

## 8. Accessibility (a11y) Standards

1. **Compliance**: System UI must adhere to **WCAG 2.1 Level AA**.
2. **Contrast Ratios**:
   - Minimum $4.5:1$ contrast ratio for standard text against its background.
   - Minimum $3.0:1$ contrast ratio for large text and interactive UI borders.
3. **No Color-Only Information**:
   - Verification statuses must combine distinct color, clear text labels, and unique SVG iconography so color-blind users can instantly distinguish states.
4. **Keyboard Accessibility**:
   - All interactive controls (buttons, file dropzones, camera toggles, tabs) must be focusable with visible focus rings and navigable via Tab/Enter/Space.
5. **Screen Reader Support**:
   - Dynamic status changes must be announced using `aria-live="polite"` or `aria-live="assertive"` regions.

---

## 9. AI Usage & Boundaries

1. **Assistive, Not Authoritative**:
   - Generative AI is an explanation layer. It synthesizes findings and analyzes ambiguous visual context.
   - AI output must never override a deterministic string mismatch or mathematical parity failure.
2. **Structured Prompts & Guardrails**:
   - System prompts sent to the Gemini API must enforce strict temperature settings ($\le 0.2$) and require JSON-structured responses.
   - Prompts must explicitly instruct the model to report only observed data and avoid speculative assertions.
3. **Graceful Degradation**:
   - If the Gemini API is degraded, unreachable, or returns a rate-limit error, the application must immediately display the raw deterministic verification report without blocking the user.

---

## 10. Testing & Benchmark Rigor

1. **Test-Driven Verification**:
   - Unit tests must validate payload extraction across all standardized UPI URI variations and standard URLs.
   - Edge cases (encoded special characters, trailing spaces, case sensitivity) must have regression tests.
2. **Benchmark Integrity**:
   - Performance and accuracy claims may only be published if derived from the documented evaluation benchmark set.
   - Test suites must be repeatable in CI environments.

---

## 11. Error Handling & Resilience

1. **Structured Error Schema**:
   - All API errors must return a consistent JSON schema:
     ```json
     {
       "error": {
         "code": "E_INVALID_IMAGE",
         "message": "The uploaded file could not be parsed as a valid image.",
         "details": null
       }
     }
     ```
2. **No Stack Trace Exposure**:
   - Raw database errors, file paths, and internal stack traces must be caught and logged server-side; they must never be returned to the client.

---

## 12. Dependency Management & Version Control

1. **Minimal Footprint**:
   - Avoid installing large libraries for trivial tasks. Evaluate bundle size impact before adding any client-side dependency.
2. **Lockfile Integrity**:
   - Package lockfiles (`package-lock.json` / `pnpm-lock.yaml` / `poetry.lock`) must be committed.
   - Run regular automated dependency vulnerability scans (`npm audit`).
3. **Git Conventions**:
   - Commit messages must follow the Conventional Commits specification:
     - `feat:` new functional capability
     - `fix:` bug correction
     - `docs:` documentation additions or updates
     - `refactor:` code restructuring without behavioral change
     - `test:` test suite additions or corrections
     - `chore:` tooling or build system maintenance
4. **Controlled Phase Progression**:
   - No phase of the development roadmap may be initiated until its preceding prerequisite phase has satisfied all documented completion criteria.
