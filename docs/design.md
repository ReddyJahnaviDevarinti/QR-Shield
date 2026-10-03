# Design System Specification: QRShield AI

Status: DRAFT  
Last Updated: 2026-10-04  
Owner: QRShield Project  

---

## 1. Visual Direction & Brand Personality

### 1.1 Visual Direction
QRShield AI is designed as a serious, professional cybersecurity and payment verification platform. The interface balances high-density information display with technical clarity, drawing inspiration from modern defense consoles, network analyzers, and financial clearinghouse terminals.

The aesthetic is **utilitarian, crisp, and high-contrast**:
- Clean architectural geometry over soft playful bubbles.
- Deep, low-fatigue slate surfaces over frivolous gradients.
- Strict visual hierarchy prioritizing rapid threat discernment.

### 1.2 Brand Personality
- **Authoritative**: Statements and classifications are grounded in verifiable technical facts.
- **Objective**: Communicates findings without sensationalism, panic, or marketing hyperbole.
- **Vigilant**: Highlights anomalies and discrepancies with surgical precision.
- **Transparent**: Never hides the underlying methodology or creates "black box" claims.

---

## 2. Color Palette & Design Tokens

The color system is built on a dark slate foundation with high-contrast neutral text and strict semantic status accents. **Purple gradients and neon glow effects are strictly prohibited.**

```
[Background: #0B0F17] ────> [Surface: #111827] ────> [Card: #182234] ────> [Border: #24334A]
Text Primary: #F8FAFC | Text Muted: #64748B | Primary Accent: #2563EB
```

### 2.1 Neutral Foundation Tokens
| Token Name | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `--color-bg-base` | `#0B0F17` | Canvas background (Deep Obsidian Slate) |
| `--color-surface-default` | `#111827` | Primary surface for panels and toolbars |
| `--color-surface-raised` | `#182234` | Elevated cards, inspect panels, table rows |
| `--color-surface-overlay` | `#1E293B` | Modal dialogs, dropdowns, contextual popovers |
| `--color-border-subtle` | `#24334A` | Default dividers, card boundaries |
| `--color-border-strong` | `#334766` | Active input borders, focused component outlines |
| `--color-text-primary` | `#F8FAFC` | Headings, primary metrics, active values |
| `--color-text-secondary` | `#94A3B8` | Body copy, secondary descriptions, labels |
| `--color-text-muted` | `#64748B` | Footers, disabled items, timestamps |

### 2.2 Brand Accent Tokens
| Token Name | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `--color-brand-primary` | `#2563EB` | Primary action buttons, active navigation markers |
| `--color-brand-hover` | `#3B82F6` | Interactive hover state for brand actions |
| `--color-brand-active` | `#1D4ED8` | Pressed / selected state |
| `--color-brand-subtle` | `rgba(37, 99, 235, 0.12)` | Selection highlight, active tab background |

### 2.3 Semantic Status Tokens (Mandatory Classifications)
Every status color must strictly correlate with one of the 5 canonical outcomes:

| Status Code | Base Hex | Background Pill Tint | Border Hex | Usage |
| :--- | :--- | :--- | :--- | :--- |
| `VERIFIED` | `#10B981` (Emerald) | `rgba(16, 185, 129, 0.12)` | `#059669` | Match confirmed; no tamper indicators |
| `DESTINATION_MISMATCH` | `#EF4444` (Crimson) | `rgba(239, 68, 68, 0.12)` | `#DC2626` | Destination differs from registered record |
| `SUSPICIOUS` | `#F59E0B` (Amber) | `rgba(245, 158, 11, 0.12)` | `#D97706` | Visual overlay or border anomaly detected |
| `UNVERIFIED` | `#64748B` (Slate) | `rgba(100, 116, 139, 0.12)` | `#475569` | Valid QR, but merchant not in registry |
| `INSUFFICIENT_EVIDENCE` | `#71717A` (Zinc) | `rgba(113, 113, 122, 0.12)` | `#52525B` | Blur, damage, or decode failure |

---

## 3. Typography & Hierarchy

### 3.1 Font Families
- **Interface & Content**: `Inter`, system-ui, -apple-system, sans-serif.
- **Technical & Data**: `JetBrains Mono`, `ui-monospace`, monospace (mandatory for raw payloads, VPAs, URLs, hashes, and coordinates).

### 3.2 Type Scale
| Role | Size | Weight | Line Height | Letter Spacing | Font Family |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title (H1)** | 28px (1.75rem) | 700 (Bold) | 1.25 | -0.025em | Inter |
| **Section Header (H2)** | 20px (1.25rem) | 600 (Semibold) | 1.30 | -0.015em | Inter |
| **Card Header (H3)** | 16px (1.00rem) | 600 (Semibold) | 1.40 | 0.000em | Inter |
| **Body (Default)** | 14px (0.875rem) | 400 (Regular) | 1.50 | 0.000em | Inter |
| **Body (Strong)** | 14px (0.875rem) | 600 (Semibold) | 1.50 | 0.000em | Inter |
| **Code / Payload** | 13px (0.8125rem)| 400 (Regular) | 1.45 | 0.000em | JetBrains Mono |
| **Caption / Meta** | 12px (0.75rem) | 500 (Medium) | 1.40 | +0.010em | Inter |

---

## 4. Spacing, Sizing & Grid

The layout enforces an 8-point geometric grid with a 4-point micro-step:

| Token | Dimension | Common Use |
| :--- | :--- | :--- |
| `--space-1` | 4px | Micro-padding, icon margins |
| `--space-2` | 8px | Button inline gaps, pill padding |
| `--space-3` | 12px | Compact cell padding, input vertical padding |
| `--space-4` | 16px | Card padding, stack spacing |
| `--space-6` | 24px | Section gaps, grid gutters |
| `--space-8` | 32px | Major layout block division |
| `--space-12` | 48px | Page header spacing |

---

## 5. Component Rules

### 5.1 Buttons
- **Shape**: Rectangular with restrained radius: `border-radius: 6px`.
- **Height**: 36px (compact) or 40px (default).
- **Variants**:
  - `Primary`: Solid `#2563EB`, text `#FFFFFF`, subtle bottom border.
  - `Secondary`: Surface `#182234`, border `1px solid #24334A`, text `#F8FAFC`.
  - `Destructive`: Surface `rgba(239, 68, 68, 0.1)`, border `1px solid #DC2626`, text `#EF4444`.
  - `Ghost`: Transparent background, hover tint `rgba(255, 255, 255, 0.06)`, text `#94A3B8`.
- **Focus**: Visible outline `2px solid #3B82F6` with a `2px` offset.
- **Prohibitions**: No bouncing animations, no multi-colored glow, no pills with full rounded circles (`border-radius: 9999px` is prohibited on standard buttons).

### 5.2 Inputs & File Upload Dropzone
- **Text Inputs**:
  - Background: `#111827`, border: `1px solid #24334A`.
  - Focus state: border `#3B82F6`, box-shadow `0 0 0 1px #3B82F6`.
  - Payloads / VPAs must render in monospace font.
- **File Upload Dropzone**:
  - Perimeter: `2px dashed #334766`.
  - Active Drag State: border `2px solid #3B82F6`, background `rgba(37, 99, 235, 0.04)`.
  - Typography: Clear label (*"Upload or drag & drop QR image"*), supported formats (*"JPEG, PNG, WEBP up to 10MB"*).
  - Prohibitions: No cartoonish cloud illustrations or floating arrows.

### 5.3 Cards & Data Containers
- Background: `#111827` or `#182234`.
- Border: `1px solid #24334A`.
- Border Radius: `6px` or `8px` max.
- Shadows: Minimal, utilitarian elevation (`box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4)`).
- Prohibitions: No excessive glassmorphism blur filters, no rounded cards $> 12\text{px}$.

### 5.4 Data Tables
- Header: Background `#0B0F17`, text `#94A3B8`, uppercase 12px with 0.05em tracking.
- Row Padding: Dense (`8px 12px`).
- Cell Values: Monetary and VPA figures must use tabular numerals (`font-variant-numeric: tabular-nums`) in monospace.
- Row Separator: `1px solid #24334A`.

### 5.5 Status Badges & Indicators
- Badges must render as structured pills:
  - Height: `24px`.
  - Border radius: `4px`.
  - Border: `1px solid [Status Border Hex]`.
  - Content: 16px SVG icon + status label in uppercase bold monospace.
  - Examples:
    - `[ShieldCheckIcon] VERIFIED`
    - `[AlertTriangleIcon] DESTINATION MISMATCH`
    - `[LayersIcon] SUSPICIOUS`
    - `[HelpCircleIcon] UNVERIFIED`
    - `[AlertCircleIcon] INSUFFICIENT EVIDENCE`

---

## 6. Feedback, States & Error Handling

### 6.1 Loading States
- Use clean, linear progress bars (`height: 2px`) or skeletal shimmer boxes in `#182234` with subtle pulse ($\le 1.5\text{s}$).
- No playful bouncing spinners, confetti, or rotating 3D cubes.

### 6.2 Empty States
- Consists of a simple technical SVG icon (24px, muted slate `#64748B`), a concise header (14px semibold), a single sentence of instruction, and an actionable button.
- Never use AI-generated empty-state illustrations or whimsical cartoons.

### 6.3 Error States
- Errors display:
  1. Formal Machine Code (`E_DECODE_FAILED`).
  2. Clear diagnosis (*"Unable to detect standard finder patterns"*).
  3. Actionable recovery step (*"Ensure the QR code is centered and free of heavy camera glare"*).

---

## 7. Responsive Behavior & Breakpoints

| Breakpoint | Range | Layout Strategy |
| :--- | :--- | :--- |
| **Mobile (`sm`)** | $360\text{px} - 639\text{px}$ | Single column layout; full-width buttons; camera viewfinder fills viewport width; collapsible navigation drawer. |
| **Tablet (`md`)** | $640\text{px} - 1023\text{px}$ | Two-column split (Scanner/Uploader on left, live telemetry on right); compact top navigation bar. |
| **Desktop (`lg`)** | $\ge 1024\text{px}$ | Multi-panel dashboard with persistent navigation rail; max layout container width capped at $1280\text{px}$. |

---

## 8. Iconography Rules

- **Icon Family**: Clean, monoline SVG icons with 1.5px to 2px stroke width (e.g., Lucide Icons).
- **Icon Sizing**: Strictly standardized at `16px` (inline/badges), `20px` (buttons/inputs), and `24px` (navigation/headers).
- **Prohibitions**:
  - **Zero Emoji Icons**: Emojis (🛡️, ⚠️, ❌, ✅, 🚀) are strictly forbidden in UI components, headers, buttons, and navigation.

---

## 9. Motion & Animation Standards

1. **Restrained & Functional**: Animations must only occur to provide state confirmation or navigation continuity.
2. **Speed Limits**:
   - Micro-interactions (hover, focus, button active): $\le 150\text{ms}$ `ease-out`.
   - Structural transitions (drawer open, modal reveal, toast slide): $\le 200\text{ms}$ `cubic-bezier(0.16, 1, 0.3, 1)`.
3. **Accessibility**:
   - Must honor `@media (prefers-reduced-motion: reduce)` by disabling all transitional animations and displaying states immediately.
4. **Prohibitions**:
   - No cursor-follow effects, no bouncy spring damping, no scroll-jacking, no infinite floating keyframes.
