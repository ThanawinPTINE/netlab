---
name: NETLab
description: Terminal-native networking lab simulator modeled on real rack-mount instrument consoles — cool "black and blue" dark theme, soft cool-neutral light theme
colors:
  bg: "#0A0B0D"
  panel: "#131518"
  panel-2: "#1B1E23"
  border: "#2B2F37"
  signal-blue: "#3D8BFF"
  signal-blue-deep: "#2563C9"
  success-green: "#46B87C"
  success-green-wash: "#16261D"
  success-green-border: "#234230"
  warning-amber: "#E5B93F"
  warning-amber-wash: "#2E2408"
  danger-red: "#F55B5B"
  danger-red-wash: "#2E1414"
  danger-red-border: "#3D1F1F"
  reserved-periwinkle: "#7B8CDE"
  prompt-teal: "#4FC3D9"
  explain-text: "#8FE0B0"
  ink: "#ECEEF1"
  ink-muted: "#9BA3AF"
  ink-faint: "#6B7280"
  btn-text-on-accent: "#FFFFFF"
typography:
  display:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "24.5px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.06em"
  mono:
    fontFamily: "Cascadia Code, Consolas, Courier New, monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  xs: "3px"
  chip: "4px"
  pill-sm: "5px"
  sm: "6px"
  input: "7px"
  md: "8px"
  card-sm: "9px"
  lg: "10px"
  card-md: "12px"
  card-lg: "14px"
  pill: "999px"
  circle: "50%"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
  7: "48px"
  8: "64px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.btn-text-on-accent}"
    rounded: "{rounded.md}"
    padding: "11px 22px"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.btn-text-on-accent}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 20px"
  button-secondary-hover:
    backgroundColor: "transparent"
    textColor: "{colors.signal-blue}"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
  input:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 13px"
---

# Design System: NETLab

## 1. Overview

**Creative North Star: "Rack & Instrument"**

Every surface is modeled on real network-equipment consoles and lab-bench instruments — rack-mount switch UIs, oscilloscope displays, status-light panels — rather than a generic templated dashboard look. The palette runs cool and high-contrast: a near-true black base ("black and blue") carries a vivid signal-blue for every interactive element, deliberately distinct in hue from the amber used for caution states, so the two never compete for the same meaning. The light theme is deliberately unadorned but not glaring — the page sits on a faint cool neutral while panels stay white, so cards separate by fill rather than by border, and recessed surfaces go one step deeper still. Both themes are built from the same tonal roles so nothing is retrofitted.

This system explicitly rejects the childish/gamified LMS look — no cartoon badges, confetti, XP bars, or streak mascots — and the generic corporate-SaaS gloss of hero-metric tiles, gradient text, glassmorphism, and soft ambient glow blobs. It should feel like a tool a network engineer would tolerate using daily, matching the AI tutor's own restraint: it withholds full answers until the student has genuinely struggled, and the interface carries that same earn-it philosophy rather than handing over shortcuts.

**Key Characteristics:**
- Flat tonal panels (`bg` → `panel` → `panel-2`) instead of shadow-driven depth — the three tones do the work of elevation in both modes, with the 1px border only sharpening the edge
- One accent hue (Signal Blue) carrying interactivity and status; green/amber/red/periwinkle reserved for semantic meaning only, each a genuinely distinct hue so none can be mistaken for another
- Monospace wherever a real CLI would use it — commands, IPs, terminal output, code chips
- A shared numeric type scale (`--step-xs` through `--step-3xl`) and spacing scale (`--space-1` through `--space-8`) drawn from consistently across all five pages
- Bilingual layouts (Thai prose, English/mono technical tokens) that don't break rhythm when Thai strings run long

**Implementation note:** color, type-scale, and spacing tokens live in `styles/tokens.css`; shared chrome (reset, body base, brand mark, theme toggle, footer note, buttons, the main-nav topbar+dropdown used by `index.html`/`labs.html`, and the breadcrumb topbar used by `dashboard.html`/`course.html`) lives in `styles/shared.css`; theme-toggle + nav-dropdown behavior lives in `scripts/theme.js`. All five HTML pages link these three files rather than redefining tokens/chrome locally — extend them there first before adding page-local CSS/JS.

## 2. Colors: Black & Blue

A near-black dark theme and a soft cool-neutral light theme, both carrying a single vivid signal-blue accent, plus a set of semantic colors chosen so each sits at a genuinely different point on the hue wheel — no two can be confused for one another even at a glance.

### Primary
- **Signal Blue** (`#3D8BFF` dark / `#2563C9` light): The one active-interaction color — links, active nav state, primary buttons, focus rings, the AI-tutor "on" pill. If it's clickable or "currently active," it's blue; nothing else competes for that role.

### Secondary (semantic status)
- **Success Green** (`#46B87C` dark / `#1F9D5C` light): completed labs, correct answers, passed checks, the R1/R2 router glyphs.
- **Warning Amber** (`#E5B93F` dark / `#97720A` light): hints, caution states, the "Feasible (backup)" route styling. A clear yellow-gold, never mixed up with Signal Blue.
- **Danger Red** (`#F55B5B` dark / `#D3382E` light): errors, locked/reveal-answer actions.
- **Reserved Periwinkle** (`#7B8CDE` dark / `#5563B0` light): a fourth topic/category rotation and advanced-concept diagrams (EIGRP successor paths, subnet component breakdowns) — a cool slate-violet, never used for primary interaction.

### Neutral
- **Background** (`#0A0B0D` dark / `#F2F5F9` light): page canvas. Dark mode runs near-true black with a cool undertone; light mode carries a faint cool tint rather than pure white, so long reading sessions in a bright room are easier on the eyes.
- **Panel** (`#131518` dark / `#FFFFFF` light): card, topbar, and terminal-window backgrounds — one step up from canvas in both modes. In light mode `panel` is the white surface that lifts off the tinted canvas, so a card reads as a card from its fill, not from its border alone.
- **Panel Deep** (`#1B1E23` dark / `#E7ECF3` light): nested surfaces — code chips, input fields, terminal title bars, figure plates. One step deeper than the canvas in light mode, so a recessed element still reads as recessed against the tinted page.
- **Border** (`#2B2F37` dark / `#C2CBD9` light): the only line-work in the system; 1px, never decorative.
- **Ink** (`#ECEEF1` dark / `#12151A` light): primary text.
- **Ink Muted** (`#9BA3AF` dark / `#4B5563` light): secondary text, labels.
- **Ink Faint** (`#6B7280` dark / `#6B7280` light): tertiary text, timestamps, hints — check this against its background before using it for anything load-bearing; at small sizes it sits close to the AA floor.

### Named Rules
**The One Accent Rule.** Signal Blue is the only color that means "interactive." Green, amber, red, and periwinkle are status-only and must never be used for a clickable primary action — that collision is what makes a status color scheme unreadable.

**The Soft-Daylight Rule.** Light mode runs three distinct cool neutrals — tinted canvas, white panel, deeper recess — never a flat sheet of `#FFFFFF`. The canvas is always tinted and the panel is always the white one, so elevation reads from fill first and border second. This replaces the earlier all-white light theme, which course review found too harsh to read against for a full lab session. Every light value must still clear WCAG AA on all three surfaces — verify before changing any of them.

**The Distinct-Hue Rule.** Every semantic role sits at a genuinely different hue, not a lighter/darker shade of a neighboring one. If a new status color is ever needed, it must fail a squint test against all five existing roles before it ships.

## 3. Typography

**Body/UI Font:** IBM Plex Sans (falls back to Segoe UI / system-ui where not installed)
**Mono Font:** Cascadia Code (with `Consolas, Courier New, monospace` fallback)

**Character:** A single UI sans carries all prose and chrome — no display serif, no second sans — so the only typographic contrast axis is sans vs. mono. Mono is not decorative here; it appears anywhere a real terminal or config file would show monospace (commands, IPs, subnet masks, code chips), which is what makes the "real tool" feeling land.

### Type scale
`--step-xs` 11px · `--step-sm` 12.5px · `--step-base` 14px · `--step-md` 16px · `--step-lg` 18.5px · `--step-xl` 21px · `--step-2xl` 24.5px · `--step-3xl` 28px, plus a one-off 34px display size for the two marketing-style heroes (`index.html`, `labs.html`) only — every other page draws exclusively from the shared scale.

### Hierarchy
- **Display** (800 weight, 34px, `-0.02em`, 1.25 line-height): the two orienting hero moments only (`index.html`, `labs.html`) — never used on the denser breadcrumb-topbar pages.
- **Title** (700–800 weight, 24.5–27px, `-0.01em` to `-0.015em`): page-level headers one tier down from a true hero — `course.html`'s `.ov-title`, `dashboard.html`'s `.page-title`, `.topic-title`, `.complete-title`. The exact size steps down further the deeper a page sits in the nav hierarchy (Home → Lab → Course → Dashboard), a deliberate cascade, not an accident.
- **Body** (400 weight, 14–16px, 1.55–1.8 line-height): all prose; Thai paragraph text runs long, so line-height stays generous rather than tight.
- **Label** (600–700 weight, 11–12.5px, letter-spacing .04–.08em, sometimes uppercase): eyebrows, chapter badges, status pills, cmd-hint labels.
- **Mono** (400–700 weight, `--step-base`–`--step-md`, 1.7 line-height): commands, IP addresses, terminal I/O, code chips. The terminal's own printed history and its live prompt/input line are now the *same* size (`--step-base`) in both desktop and mobile — they previously mismatched, which read as two different components rather than one continuous stream.

### Named Rules
**The Mono-Means-Real Rule.** If a string is something you'd literally type into a router or see in its output — a command, an IP, a subnet mask, a config line — it renders in Cascadia Code. Everything else, including labels and headers, stays in IBM Plex Sans.

**The One Terminal Rule.** Every piece of text inside the terminal component — history, prompt, live input — is one size. A terminal that mixes sizes internally stops reading as a real terminal.

## 4. Elevation

Flat-by-default, shadow-on-overlay — unchanged from the system's first iteration; this held up well and needed no revision. Surfaces at rest (cards, panels, the terminal window, nav bars) get zero shadow — depth comes entirely from tonal layering (`bg` → `panel` → `panel-2`) plus a single 1px `border`. Shadows are reserved strictly for things that float above the normal document flow: the hint popover and the mobile slide-in chat/sidebar drawers, plus the mobile nav dropdown on `index.html`/`labs.html`.

### Shadow Vocabulary
- **Popover** (`box-shadow: 0 4px 16px rgba(0,0,0,.5)`): the floating hint box in the lab view.
- **Drawer** (`box-shadow: 6px 0 24px rgba(0,0,0,.4)` / `-6px 0 24px rgba(0,0,0,.4)` / `0 8px 16px rgba(0,0,0,.4)`): mobile slide-in sidebar/chat panel and the mobile nav dropdown — all three now share the same `.4` alpha (the mobile nav dropdown briefly drifted to a one-off `.2` during an earlier pass; normalized here).

### Named Rules
**The Overlay-Only Rule.** Shadows exist to mark something as temporarily above the layout (popover, drawer, dropdown). Nothing that sits permanently in the page flow gets a shadow, ever.

## 5. Components

Buttons, inputs, and status chips should feel tactile and mechanical — like real console controls, not soft consumer-app affordances: tight radii, an immediate hover/focus response, and no decorative flourish beyond that.

### Buttons
- **Shape:** 8–9px radius (`rounded.md`); pill (999px) only for the tag/topic chip family, never for standard buttons.
- **Primary:** Signal Blue background, white text (both themes), 700 weight, `11px 22px` padding. One canonical implementation in `shared.css`, used by `index.html` and `course.html`.
- **Secondary/Ghost:** transparent background, 1px `border`, `text` color; on hover, border and text both shift to Signal Blue.
- **Destructive (reveal-answer):** danger-red-wash background with red border and red text.
- All buttons carry a visible `:focus-visible` ring in Signal Blue.

### Chips
- **Topic/step pills:** small rounded-rect (7–8px radius), tinted wash background of the semantic color, 1px border in the solid version of that color, text in the solid color. The topic-icon chip (index.html) now actually renders its glyph — an earlier `font-size:0` bug hid all 13 icons; fixed.
- **Command chips (inline code):** `panel-2` background, `ink` text, mono font, 4px radius, tight padding.

### Cards / Containers
- **Corner style:** 10–14px radius depending on size. Never exceed ~14px.
- **Background:** `panel`, occasionally `panel-2` for a nested/recessed card.
- **Shadow strategy:** none (see Elevation).
- **Border:** 1px solid `border`, always full-perimeter. **The two `border-left` side-stripe accents documented as a "legacy exception" in the prior version of this system (the pre-test explanation box and the command-hint box) have been retired** — both now use a full border + tinted wash background, consistent with every other callout in the system. There is no longer a side-stripe exception anywhere in the codebase.

### Inputs / Fields
- **Style:** `panel-2` background, 1px `border`, 7px radius, `8px 13px` padding.
- **Focus:** border shifts to `signal-blue-deep`; the terminal's own input has no visible border and uses a blue caret instead — an intentional exception because it's meant to feel like a real shell prompt.

### Navigation
- **Topbar:** fixed-height (52–60px) `panel` bar, 1px bottom border; sticky on the main-nav pages, static on breadcrumb pages. Breadcrumb-style on nested lab pages (`Lab › Course › Lab 5`), flat link list + hamburger dropdown on top-level pages.
- **States:** default text is `ink-muted`; active/hover states shift to `ink` (hover) or `signal-blue` with a `signal-blue` wash background (active). All nav elements carry `:focus-visible`.
- **Mobile:** nav links collapse into a dropdown (main-nav pages) or hide (breadcrumb pages); the topbar keeps hamburger triggers for the off-canvas sidebar/chat drawers on `lab5.html` (see Elevation → Drawer). The mobile hamburger/chat toggle buttons are 44×44px.

### Terminal & AI Tutor Panel (signature component)
The terminal window uses faux macOS-style chrome (three colored dots, a title bar in `panel-2`) at the top of a `bg`-colored scroll area, monospace throughout, with the prompt rendered in **Prompt Teal** (`#4FC3D9` dark / `#0E7C8C` light) — a distinct shade of the cool family chosen to read as "machine output" without being mistaken for Signal Blue itself, used nowhere else in the system. The adjacent AI tutor chat panel mirrors standard chat-bubble conventions (avatar + bubble, 8px radius) but stays inside the same bordered/flat-panel language as the rest of the system — no floating card shadows, no gradient bubbles.

## 6. Do's and Don'ts

### Do:
- **Do** keep Signal Blue as the only color meaning "interactive" — every other color is semantic/status only, and each sits at a genuinely distinct hue.
- **Do** render anything a real CLI would show in monospace (Cascadia Code): commands, IPs, subnet masks, terminal output, inline code chips.
- **Do** draw every new size from the shared `--step-*` type scale and `--space-*` spacing scale in `tokens.css` rather than a new one-off pixel value.
- **Do** keep new components flat at rest (tonal layering + 1px border) and reserve shadows for true overlays (popovers, drawers, dropdowns).
- **Do** define both dark and light theme values for any new token — this system has no "we'll add light mode later."
- **Do** keep radii in the 6–14px band for rectangular components; use 999px/50% only for pills and circular status glyphs.
- **Do** design copy and empty/error states so the student has to attempt the task before the tool concedes the answer — matching the AI tutor's own hint-rationing behavior.

### Don't:
- **Don't** introduce a childish/gamified LMS look — no cartoon badges, confetti, XP bars, streak mascots, or mascot illustrations.
- **Don't** reach for corporate-SaaS clichés: gradient text, glassmorphism, hero-metric tiles, soft radial-gradient glow decoration, decorative uppercase-tracked eyebrows on every section. (The hero's own gradient glow-blob was removed for exactly this reason.)
- **Don't** add a `border-left`/`border-right` colored stripe as a callout accent — the system no longer has even a legacy exception for this; use a full border, tinted background, or leading icon.
- **Don't** pair a visible 1px border with a soft wide drop-shadow on the same element (buttons, cards) — pick one.
- **Don't** use Prompt Teal (`#4FC3D9` / `#0E7C8C`) for anything except rendered terminal/router output.
- **Don't** let `ink-faint` carry body text or anything load-bearing — verify contrast in both themes before using it for more than a timestamp or a disabled hint.
- **Don't** hardcode a color literal that duplicates a token's value (e.g. a raw `rgba(...)` matching `--cyan-wash`) — a full sweep found 17+ instances of this from the system's first iteration; reference the token instead so a future palette change can't silently miss a spot.
