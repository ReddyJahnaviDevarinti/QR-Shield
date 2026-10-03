# Design System Specification: QRShield AI

Status: PRODUCTION-READY (FOUNDATION IMPLEMENTED)
Last Updated: 2026-10-04
Owner: QRShield Project

---

## 1. Visual Direction & Brand Personality

### 1.1 Visual Direction
QRShield is an enterprise-grade cybersecurity and payment verification product. The interface balances high-density technical clarity with visual restraint, communicating **verification, evidence, trust, and clarity**.

The aesthetic is **utilitarian, crisp, and high-contrast**:
- Clean architectural geometry over soft playful bubbles.
- Restrained dark slate surfaces over frivolous gradients.
- Strict visual hierarchy prioritizing rapid threat discernment.
- No purple brand accents, no neon glow, no AI robot avatars, and no sci-fi gimmicks.

### 1.2 Brand Identity & Descriptor
- **Product Name**: `QRShield`
- **Professional Descriptor**: `Payment QR Verification`
- **Voice**: Factual, evidence-grounded, restrained, and precise. No unsupported claims ("world's best", "revolutionary", "AI-powered future").

---

## 2. Color System & Centralized Design Tokens

The color system uses a disciplined dark palette defined in `frontend/src/styles/tokens.css`. All components derive their colors strictly from these CSS variables.

### 2.1 Surface & Neutral Foundation Tokens
| Token Name | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `--color-bg-base` | `#080C12` | Near-black canvas background |
| `--color-bg-subtle` | `#0D1420` | Subtle background elevation |
| `--color-surface-default` | `#111927` | Primary surface for cards, header, and panels |
| `--color-surface-raised` | `#162132` | Elevated containers, table cells, inputs |
| `--color-surface-overlay` | `#1C283D` | Dropdowns, dialog overlays, tooltips |
| `--color-border-subtle` | `#243247` | Default structural 1px dividers and borders |
| `--color-border-strong` | `#2B3A50` | Focused boundaries, active card borders |
| `--color-border-focus` | `#60A5FA` | Accessible focus-visible ring indicator |
| `--color-text-primary` | `#F5F7FA` | Primary headings, active values, high contrast |
| `--color-text-secondary` | `#A8B4C5` | Body copy, secondary descriptions, labels |
| `--color-text-muted` | `#718096` | Footers, disabled states, technical annotations |

### 2.2 Primary Action & Interactive Tokens
| Token Name | Hex Value | Semantic Purpose |
| :--- | :--- | :--- |
| `--color-brand-primary` | `#2563EB` | Solid deep blue for primary actions |
| `--color-brand-hover` | `#3B82F6` | Electric blue hover state for primary controls |
| `--color-brand-active` | `#1D4ED8` | Pressed / active brand state |
| `--color-brand-focus` | `#60A5FA` | Focus outline and link accent |
| `--color-brand-subtle` | `rgba(37, 99, 235, 0.12)` | Active navigation background tint |

### 2.3 Semantic Status System (5 Canonical Statuses)
Every status color corresponds to exactly one of the five canonical outcomes. Each status includes text, outline icon, color, and accessible contrast:

| Status Code | Base Hex | Background Tint | Border Hex | Outline Icon | Non-Color Cue / Meaning |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `VERIFIED` | `#16A34A` | `rgba(22, 163, 74, 0.12)` | `#15803D` | `CheckCircle2` | Check icon; exact destination match confirmed |
| `DESTINATION_MISMATCH` | `#DC2626` | `rgba(220, 38, 38, 0.12)` | `#B91C1C` | `XCircle` | X icon; payee VPA conflicts with registered target |
| `SUSPICIOUS` | `#F59E0B` | `rgba(245, 158, 11, 0.12)` | `#D97706` | `AlertTriangle` | Triangle icon; physical sticker overlay/anomaly |
| `UNVERIFIED` | `#A8B4C5` | `rgba(113, 128, 150, 0.14)` | `#4A5568` | `HelpCircle` | Help/question icon; readable target not registered |
| `INSUFFICIENT_EVIDENCE`| `#94A3B8` | `rgba(100, 116, 139, 0.14)` | `#475569` | `Info` | Info icon; blur, damage, or decode failure |

---

## 3. Typography & Hierarchy

### 3.1 Font Families
- **Interface & Content**: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif.
- **Technical & Data**: `JetBrains Mono`, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace.
- Decorative display fonts and all-caps paragraphs are strictly prohibited. Uppercase is permitted only for compact status badges, category labels, and metadata.

### 3.2 Type Scale & Hierarchy
| Role | Size | Weight | Line Height | Letter Spacing | Font Family |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Hero** | 32px (2.00rem) | 700 (Bold) | 1.20 | -0.025em | Inter |
| **Page Title (H1)** | 28px (1.75rem) | 700 (Bold) | 1.25 | -0.025em | Inter |
| **Section Header (H2)** | 20px (1.25rem) | 600 (Semibold) | 1.30 | -0.015em | Inter |
| **Card Header (H3)** | 16px (1.00rem) | 600 (Semibold) | 1.40 | 0.000em | Inter |
| **Body (Default)** | 14px (0.875rem) | 400 (Regular) | 1.50 | 0.000em | Inter |
| **Body Small** | 13px (0.8125rem)| 400 (Regular) | 1.50 | 0.000em | Inter |
| **Label / Metadata** | 12px (0.75rem) | 500 (Medium) | 1.40 | +0.020em | Inter |
| **Technical / Monospace**| 13px (0.8125rem)| 400 / 600 | 1.45 | 0.000em | JetBrains Mono |

---

## 4. Spacing System (8px Grid)

All layout dimensions, paddings, and margins enforce a strict 8-point geometric system:

| Token | Dimension | Common Use |
| :--- | :--- | :--- |
| `--space-1` | 4px | Micro-padding, icon gaps |
| `--space-2` | 8px | Button inline gaps, pill padding |
| `--space-3` | 12px | Input vertical padding, compact card gaps |
| `--space-4` | 16px | Standard card padding, stack spacing |
| `--space-6` | 24px | Section gaps, grid gutters |
| `--space-8` | 32px | Major layout block division |
| `--space-10` | 40px | Hero padding |
| `--space-12` | 48px | Page header spacing |
| `--space-16` | 64px | Page bottom padding |

---

## 5. Corners & Elevation

- **Modest Corner Radii**:
  - `--radius-sm`: `6px` (inputs, badges, small buttons)
  - `--radius-md`: `8px` (cards, panels, standard buttons)
  - `--radius-lg`: `10px` (dropzones, complex modal panels)
  - `--radius-xl`: `12px` (outer modal viewports)
  - `--radius-pill`: `9999px` (reserved strictly for status badges and compact metadata tags)
- **Elevation**:
  - `--shadow-subtle`: `0 1px 3px rgba(0, 0, 0, 0.35)`
  - `--shadow-panel`: `0 4px 12px rgba(0, 0, 0, 0.4)`
- 1px structural borders (`var(--color-border-subtle)`) establish visual depth rather than heavy drop shadows.

---

## 6. Iconography Rules

- **Library**: `lucide-react` (clean outline SVGs with 1.75px to 2.25px stroke width).
- **Standardized Sizing**:
  - `12px` - `14px`: Status badge inline icons, data row tags.
  - `16px`: Buttons, card title badges.
  - `18px`: Alerts, form helpers.
  - `20px`: Empty state centers, action indicators.
  - `24px` - `32px`: File dropzones, error banners.
- **Zero Emojis**: Emojis are strictly prohibited anywhere in UI components, badges, or buttons.

---

## 7. Component System

### 7.1 Buttons (`Button.tsx`)
- **Sizes**:
  - `sm`: 32px height, 12px horizontal padding, 13px font.
  - `md`: 38px height, 16px horizontal padding, 14px font.
  - `lg`: 44px height, 20px horizontal padding, 15px font.
- **Variants**:
  - `primary`: Solid `#2563EB`, text `#FFFFFF`.
  - `secondary`: Neutral `#162132` with border `#243247`.
  - `outline`: Transparent background with strong border.
  - `danger`: Reserved for destructive actions (`#DC2626`).
  - `ghost`: Transparent with subtle hover tint.
- **Semantics**: Button text describes actions clearly ("Verify QR", "Register Destination", "Open Dashboard").

### 7.2 Form Inputs (`Input.tsx`, `Select.tsx`)
- Accessible form elements with associated `<label>`, helper text, error text, and keyboard focus states.
- Monospace variant (`isMonospace`) for VPAs, transaction IDs, and merchant codes.
- Controlled and uncontrolled `id` binding with `React.useId()`.

### 7.3 File Dropzone (`FileDropzone.tsx`)
- Supports 7 distinct visual states:
  - `idle`: Upload prompt with format disclosure ("PNG, JPG or WEBP", max 10MB).
  - `hover`: Enhanced border on pointer proximity.
  - `dragover`: Electric blue highlight and tint.
  - `uploading`: Loading spinner with byte stream indication.
  - `processing`: Analysis indicator.
  - `success`: Green check with uploaded filename.
  - `failure`: Mismatch error banner with format reminder.
- Fully accessible via keyboard (`Enter` or `Space` to trigger file selection).

### 7.4 Content Containers (`Card.tsx`, `PageHeader.tsx`, `DataRow.tsx`, `Divider.tsx`)
- **`Card`**: Standardized container with title, subtitle, badge, action slot, and subtle border.
- **`PageHeader`**: Displays category badge, H1 title, subtitle, and responsive action bar.
- **`DataRow`**: Monospace technical key-value rows with label, value, and annotation.
- **`Divider`**: 1px structural separator with optional uppercase monospace label.

### 7.5 States & Feedback (`Alert.tsx`, `EmptyState.tsx`, `LoadingState.tsx`, `ErrorState.tsx`)
- **`Alert`**: Categorized banners (`info`, `warning`, `error`, `success`) with semantic roles (`alert` or `status`).
- **`EmptyState`**: Honest empty states ("No scan submitted.", "No trusted destinations registered yet.") without fake metrics.
- **`LoadingState`**: Spinner or skeleton shimmer mode with accessible `aria-busy="true"`.
- **`ErrorState`**: Diagnostic banner with failure description and retry button.

---

## 8. Navigation & Responsive Behavior

### 8.1 Header Navigation (`Header.tsx`)
- **Desktop**:
  - Left: QRShield brand mark (`ShieldCheck` icon) + compact `UI Foundation` indicator.
  - Right: Navigation links (`Overview`, `Verify Scan`, `Dashboard`).
  - Active Route: Distinct background tint (`var(--color-surface-raised)`) and border.
- **Mobile**:
  - Hamburger toggle (`Menu` / `X` icon).
  - Slide-down drawer with full-width touch targets.
  - No horizontal overflow under any viewport width (tested at 360px).

### 8.2 Breakpoints
- **Mobile (`<640px`)**: Single-column stacked layouts, full-width touch buttons, collapsible menu.
- **Tablet (`640px - 1023px`)**: 2-column grids, horizontal nav links.
- **Desktop (`>=1024px`)**: Multi-column console layout with 1200px max-width container.

---

## 9. Motion Standards & Reduced Motion

- **Transitions**: Constrained to subtle micro-interactions ($\le 150\text{ms}$ `ease-out`).
- **No Heavy Physics**: No bounce effects, no cursor-follow, no parallax, no floating elements.
- **Accessibility**: `@media (prefers-reduced-motion: reduce)` resets all transitions and animations to `0.01ms`.
