# ChargeWise Design System Specification

## 1. Overview
ChargeWise pairs an airy **cool slate & electric cobalt** tonal palette with subtle **Apple-style liquid glass** translucency (`backdrop-filter: blur(...) saturate(...)`, soft specular top highlights, and ambient atmospheric gradients). It is designed for high-trust mobility planning across Karnataka with balanced hierarchy, clean sans-serif typography, tabular telemetry numbers, and strong WCAG 2.2 AA contrast.

## 2. Tokens & Foundations (`frontend/src/index.css`)
- **Tonal Slate & Ink Shades:**
  - `#0F172A` (`--ink-950`): Primary display & heading ink
  - `#1E293B` (`--ink-800`): Strong UI labels & secondary button ink
  - `#334155` / `#475569` (`--ink-700`, `--ink-600`): Body copy & metadata
  - `#64748B` / `#94A3B8` (`--ink-500`, `--ink-400`): Captions, muted labels & disabled states
- **Cohesive Electric Cobalt & Ice-Indigo Shades:**
  - `#1E40AF` / `#1D4ED8` / `#2563EB` (`--blue-800`, `--blue-700`, `--blue-600`): Primary action gradient, active navigation pill, verified map markers, route polyline & primary SOC visualization
  - `#3B82F6` / `#BFDBFE` / `#DBEAFE` / `#EFF6FF` (`--blue-500`..`--blue-50`) & `#E0E7FF` (`--indigo-100`): Tinted cards, pill fills, icon wells, and hover highlights
- **Semantic EV Trust & Status Shades:**
  - Verified / Available Teal: `#115E59` / `#0F766E` / `#0D9488` ink & accents over frosted `rgba(204, 251, 241, 0.82)`
  - Caution / Occupied Amber: `#92400E` ink over frosted `rgba(254, 243, 199, 0.84)`
  - Unavailable / Error Rose: `#BE123C` ink over frosted `rgba(255, 228, 230, 0.86)`
- **Liquid Glass Surfaces:**
  - `.cw-glass-nav`: Sticky header (`rgba(247, 250, 255, 0.74)`, `blur(26px) saturate(190%)`)
  - `.cw-card`: Primary surface (`rgba(255, 255, 255, 0.74)`, `blur(22px) saturate(180%)`, specular inset rim `rgba(255, 255, 255, 0.95)`)
  - `.cw-card-muted`: Nested container (`rgba(239, 245, 255, 0.66)`, `blur(16px) saturate(165%)`)
  - `.cw-card-highlight`: Gradient frosted callout (`linear-gradient(135deg, rgba(224,236,255,0.86), rgba(238,242,255,0.74))`, `24px` radius)
- **Typography:**
  - Display / Headings / Controls: `"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif`
  - Body / Forms: `"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`
  - `.cw-num`: `font-variant-numeric: tabular-nums` for battery SOC percentages, distances, power ratings, and coordinates.
- **Tailwind CSS v4 Layer Architecture:** Base resets and typographic defaults live inside `@layer base`, and reusable `.cw-*` components live inside `@layer components` so Tailwind spacing and color utilities always compose cleanly without cascade overrides.

## 3. Core Components
- **Primary Button (`.cw-btn-primary`):** Rounded-pill cobalt gradient (`#2563EB` → `#1D4ED8`) with specular top inset highlight and subtle lift on hover.
- **Secondary Button (`.cw-btn-secondary`):** Frosted translucent white pill (`rgba(255, 255, 255, 0.78)` with `blur(14px)`), hovering cleanly to ice blue (`rgba(239, 246, 255, 0.95)`).
- **Status Pills (`.cw-pill`, `.cw-pill-verified`, `.cw-pill-accent`, `.cw-pill-warning`, `.cw-pill-danger`):** Non-wrapping translucent pill badges matching ChargeWise's 6-state verification taxonomy.
- **Maps & Charts:** OpenStreetMap Leaflet tiles (`StationMap.tsx`, `TripRouteMap.tsx`) with gradient cobalt/slate markers, frosted cluster badges, glass popups, and cobalt/teal Recharts visualizations.

## 4. Accessibility & Honesty Rules
- Clear contrast across frosted layers (`#0F172A`, `#1E293B`, `#334155`, `#475569` on bright translucent surfaces).
- Keyboard-visible cobalt focus ring (`2px solid #2563EB`), semantic `<button>`/`<a>` navigation, and skip-to-content link.
- Live occupancy is never fabricated: unknown charger status stays `"Live Status: Unknown"`, and unverified hours/pricing remain explicitly labeled.
