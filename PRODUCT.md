# Product

## Register

product

## Users

University networking course students (Cisco IOS / networking fundamentals, CCNA-adjacent) working through structured labs — static/default routing, RIP, OSPF, EIGRP, BGP, DHCP, VLSM/CIDR. They arrive with partial knowledge from lecture and need hands-on practice configuring a router without the stakes of touching real hardware wrong. Sessions happen at a desk, laptop, working alone or half-focused on a terminal while cross-referencing docs.

## Product Purpose

Build real Cisco IOS command muscle memory in a safe simulated terminal. Success is a student who can configure routing correctly under exam/lab conditions — not just recognize the right answer, but produce the exact command sequence unprompted. The AI tutor (NETLab backend) exists to support this without shortcutting it: it rations hints based on mistake count, refusing full answers until the student has genuinely struggled, and answers in Thai, concise, step-by-step.

## Brand Personality

Precise, patient, no-nonsense. Voice matches a real engineering tool, not a course companion app — terse feedback, monospace where it matters (commands, terminal output), no forced encouragement copy. The tutor's restraint (withholding answers, capping response length, escalating only after repeated mistakes) is a personality trait, not just a feature.

## Anti-references

Not a childish/gamified LMS — no cartoon badges, confetti, XP bars, streak mascots, or other consumer-app gamification. This should read as a tool a network engineer would tolerate using, not a course-completion toy. Also avoid generic corporate-SaaS gloss (hero-metric tiles, gradient text, glassmorphism, decorative eyebrows) — the existing terminal/IDE aesthetic (faux window chrome, monospace command rows, restrained cyan accent) is the right lane and should be extended, not replaced.

## Design Principles

- **The terminal is the product.** Every surface (dashboard, reference pages, lab chrome) should feel like it belongs next to a real CLI, not like marketing wrapped around one.
- **Earn the answer.** UI and copy should reflect the tutor's own philosophy — don't hand the user the destination for free; hints, progress, and feedback should reward genuine effort over shortcuts.
- **Restraint over decoration.** Color, motion, and copy stay functional (status, hierarchy, feedback) rather than decorative. The existing semantic palette (cyan primary, green/amber/red/purple status colors) already does this — new work should reuse those roles rather than inventing new accents.
- **Bilingual by default.** Content is Thai-first with embedded technical English (commands, protocol names, IP notation) — layouts must accommodate longer Thai text strings without breaking rhythm.
- **Dark-first, light-equal.** Both themes are first-class (the existing `[data-theme="light"]` token overrides prove this); new components must define both, not retrofit light mode later.

## Accessibility & Inclusion

Standard WCAG AA baseline: verify contrast in both themes (the existing dark theme's `--text2`/`--text3` grays are borderline on `--panel2` — check new usages against 4.5:1), keyboard-operable terminal and chat interactions, and honor `prefers-reduced-motion` for any new transitions. No additional known user needs beyond AA at this time.
