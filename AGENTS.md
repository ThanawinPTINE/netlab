# AGENTS.md

## Design Context

This project has `PRODUCT.md` and `DESIGN.md` at the project root — read them before any UI/design work.

- **PRODUCT.md**: register (`product`), users (university networking-course students), purpose (build real Cisco IOS command muscle memory), brand personality (precise, patient, no-nonsense), anti-references (no gamified LMS look), accessibility (WCAG AA).
- **DESIGN.md**: the visual system — "Rack & Instrument," black-and-blue dark theme / pure-white light theme. One accent hue (Signal Blue) for all interactivity, semantic status colors at genuinely distinct hues (green/amber/red/periwinkle), flat-by-default elevation with shadows reserved for overlays only, monospace for anything CLI-real, a shared type/spacing scale across every page.
- `.impeccable/design.json` is the machine-readable sidecar (tonal ramps, component snippets) consumed by the `$impeccable live` panel.
