# ChargeWise Design System Specification

**Authoritative Source:** `design-system-google-antigravity` (`SKILL (1).md`)

## 1. Overview
ChargeWise uses the Google Antigravity editorial light-surface design system for calm, high-trust mobility planning across Karnataka. It avoids flashy gradients and decorative dashboards in favor of crisp hierarchy, readable typography, and accessible contrast (WCAG 2.2 AA).

## 2. Tokens & Foundations
- **Colors (Strict Extracted Set Only):**
  - `#F8F9FC` (`--color-6`): Application canvas background
  - `#FFFFFF` (`--color-7`): Primary elevated card surface & text on dark buttons
  - `#E6EAF0` (`--color-5`): Hairline borders & dividers
  - `#B7BFD9` (`--color-4`): Accent dark / highlight panels & subtle focus halo
  - `#6A6A71` (`--theme-button-states-on-disabled`): Disabled ink & tertiary metadata
  - `#45474D` (`--color-2`): Secondary body ink & icons
  - `#121317` (`--color-1`): Primary ink, active badges, & primary CTA background
- **Typography:** `Google Sans Flex, Google Symbols, Times`; sizes strictly `11px, 13px, 15px, 16px, 18px, 22px, 28px, 42px, 54px`; weights `300, 400, 450, 500, 550, 600`.
- **Spacing:** 4px grid (`2px`–`328px` named tokens).
- **Border Radii (Strict Set):** `16px`, `36px`, `999px`, `1584px`, `9999px`.
- **Elevation:** `rgba(18, 19, 23, 0.04) 0px 2px 8px 0px`.

## 3. Anatomy, Variants, and Responsive Behavior
- **Primary Button (`cw-btn-primary`):** Dark ink pill (`#121317` bg, `#FFFFFF` text, `999px` radius).
- **Secondary Button (`cw-btn-secondary`):** White surface pill (`#FFFFFF` bg, `#E6EAF0` border, `#121317` text, `999px` radius).
- **Cards (`cw-card`, `cw-card-highlight`):** `16px` or `36px` radius, `1px solid #E6EAF0`, `--shadow-sm`.
- **Responsive Grids:** Single-column mobile stack (`< 768px`) expanding to 12-column split map + itinerary panels on desktop (`>= 1024px`).

## 4. States & Interactions
Every interactive component implements `default`, `hover`, `focus-visible` (`2px solid #121317`), `active`, `disabled` (`#6A6A71` text on `#E6EAF0` / `#F8F9FC`), `loading` (skeleton/disabled spinner), `error` (high-contrast border + plain-text explanation), and `empty` states.

## 5. Accessibility
- Minimum contrast verified: `#121317` on `#F8F9FC` (> 16:1), `#45474D` on `#FFFFFF` (> 9:1), `#6A6A71` on `#FFFFFF` (> 5.2:1) — satisfies WCAG 2.2 AA.
- Native `<button>` and `<a>` semantics (never nested interactive elements), ARIA labels on map controls, keyboard-reachable skip/nav focus states.

## 6. Content Guidelines
- Sentence-case copy (never full-uppercase paragraphs).
- Clear trust distinction: every charging metric explicitly states **Verified**, **Estimated**, or **Unknown**.

## 7. Anti-Patterns Avoided
- No colors outside the 7 extracted hex tokens.
- No unverified "Available" badges when live CPO telemetry does not exist.
- No arbitrary `4px`/`8px`/`12px` card radii; strictly `16px`, `36px`, or `999px`.
