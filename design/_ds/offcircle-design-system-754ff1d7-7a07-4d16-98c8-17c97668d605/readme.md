# Off-Circle Design System

> **超元工作室 · OFF-CIRCLE STUDIO** — an indie game studio in Chengdu building **空裂 · Project Breach (空裂：源起 / Project Breach: Origins)**, a hero-strategy auto-chess roguelite with mixed-media narrative.

This design system captures the studio's lore-rich, atmospheric visual language and packages it as reusable tokens, components, foundation cards, and a website UI kit. It is intended to power the marketing & lore site, the in-browser game demo, and pitch materials as the studio matures toward a native app and stylized 3D.

---

## Sources

This system was built from materials the studio provided. You may not have access — they are recorded here for provenance.

- **Live site code:** `biaowww/offcircle-website` (attached as a local folder). Production site: <https://offcircle-studios.com>. The home (`index.html`) and careers (`careers.html`) pages are the source of truth for copy and the current visual direction.
- **Figma:** `超元网站.fig` — pages `/page` (component spec: header, menu, button states) and `/page2`. Frames referenced: `/page/section` (组件规范), `/page/1`, `/page/frame`, `/page/about-hero`.
- **Logo package:** `uploads/logo_compressed.zip` — 8 lockups (horizontal/vertical/mark, on white/black/transparent) + the brand-mark interpretation doc (`uploads/logo-brand-doc.docx`).
- **Concept art:** hero/about carousel paintings (`assets/concept-*.jpg`) — the canonical "visual world."

> Want to go deeper or extend the live site? Explore the repo at **github.com/biaowww/offcircle-website** and re-attach the `.fig` for component specs.

---

## The brand in one breath

The mark is two intersecting circles forming **OC**:
- **O — the loop** (*Off-Circle*): the inherent cycle of life, markets and game systems. The ring we study and respect.
- **C — the breach** (*Off-Circle*): the ring left **open**. A creative deviation — the rebel will to break the pattern.

The game's name, **空裂 ("the sky splits")**, is that philosophy made world: a fracture in the heavens letting gold light into a misty, jade-tiled fantasy city. Every visual decision serves **atmosphere over flash**.

---

## CONTENT FUNDAMENTALS

How Off-Circle writes.

- **Bilingual, Chinese-led.** Primary copy is Simplified Chinese; English appears as section labels/eyebrows (`About Us`, `Work With Us`, `Contact Us`, `Learn More`, `sign up`) and product taglines. Page titles often pair both: `空裂：源起` with `Project Breach: Origins`.
- **Voice — "we" (我们), warm and earnest.** The studio speaks as a collective: *"我们致力于打造高质量、富有创意的游戏体验"*, *"我们相信，游戏不仅是娱乐，更是一种艺术表达和文化传承。"* It addresses the reader directly and invitingly: *"加入我们的社区，成为游戏世界的一部分。"*
- **Tone:** aspirational and craft-proud, never hype-y or jokey. Themes: art + story + technology (艺术、故事与技术), creativity (创意), cultural inheritance (文化传承), community.
- **Casing:** English UI labels are frequently **lowercase** (`sign up`, `careers`) or Title Case (`Learn More`, `Work With Us`) — a quiet, understated register. Avoid ALL-CAPS shouting except the wordmark (`OFF-CIRCLE`) and spaced-caps eyebrows.
- **Punctuation:** full-width Chinese punctuation (`，。：（）`); the full-width colon in titles (`空裂：源起`).
- **No emoji.** A single utilitarian gear glyph (`⚙`) marks the language toggle; otherwise none. Icons are line-drawn SVG or PNG, not emoji.
- **Job copy** is structured and concrete: a department tag (`Art / 美术`), a role title, location (`成都`), a short paragraph, then a `•`-bulleted requirements list and a `careers@` mailto.

When writing new copy: lead in Chinese, keep English labels short and lowercase/Title Case, speak as 我们, stay sincere and craft-focused, and never pad with marketing fluff.

---

## VISUAL FOUNDATIONS

The "misty oriental-fantasy" system. See live specimens in the **Design System** tab.

- **Mood:** painterly, atmospheric, warm. Floating pagoda-cities, jade-tiled roofs, lantern gold, fog, and the crackling breach overhead. Reference: `assets/concept-*.jpg`.
- **Color** (`tokens/colors.css`):
  - **Ground — warm ink.** Near-black browns (`--ink-900 #0D0B09`, `--ink-800 #18110B`), never neutral grey. The void.
  - **Text — bone/parchment.** Warm off-whites (`--bone-100 #E8E0D0` primary, stepping down through `--bone-300/400/500` for secondary/muted/footnote).
  - **Accent — aged gold = "breach light."** `--gold-500 #C4A35A` is *the* brand accent; `--gold-300 #E8C547` for bright highlights, `--gold-400 #D4AF37` for CTAs/focus. Reserve gold for **one luminous gesture per view** (a link, a focus ring, a single CTA edge, the glow).
  - **Secondary — jade/celadon** (`--jade-500 #4A8169`), pulled from the roof tiles. Used sparingly for a second category or "live/positive" states.
  - **Mist** (cool sky tones) is atmospheric only.
- **Type** (`tokens/typography.css`): a **serif-for-soul / sans-for-system** duality.
  - **Display — Cormorant Garamond + 思源宋体 Noto Serif SC** (`--font-display`): heroes, world-titles, section headings. Tight tracking (`--ls-tightest`).
  - **Body / UI — Space Grotesk + 思源黑体 Noto Sans SC** (`--font-sans`): geometric grotesque echoing the round `OFF-CIRCLE` wordmark.
  - **Numerals — Space Mono** (`--font-mono`): stats, costs, timers, tabular game data.
  - *(Substitution flag — see Caveats.)*
- **Spacing & layout** (`tokens/spacing.css`): 8px base rhythm; sections breathe at `--space-20` (80px) vertical. Containers `600 / 860 / 900 / 1200px`. Gutter 40px (20px mobile).
- **Corner radii:** deliberately **small** — `2–4px` on cards/inputs/buttons (`--radius-xs/sm/md`), `8px` max, `pill` only for dots/avatars. The brand reads sharp and architectural, not soft.
- **Cards:** hairline border (`rgba(255,255,255,0.08)`), near-flat fill (`rgba(255,255,255,0.02)`), tiny radius. **Hover:** lift `-2px`, border brightens. **Active/expanded:** gold border + faint fill. No drop-shadow on resting cards.
- **Borders & dividers:** 1px hairlines at 5–8% white; a **2px gold left-border** accents quote/requirement blocks; outlined CTAs use a 2px border that turns gold on hover.
- **Shadows & glow** (`tokens/effects.css`): warm-tinted shadows (`--shadow-sm/md/lg`, never neutral grey). The **gold glow** (`--glow-gold-md`) is the one "magical" affordance — focus states, the logo, a primary CTA. Use it rarely.
- **Imagery:** warm, painterly concept art, full-bleed, always under a **scrim** for legibility — radial vignette (`--scrim-radial`) behind centred hero text, bottom gradient (`--scrim-bottom`) under captions, flat 70% veil (`--scrim-flat`) on About bands. Background texture (`assets/bg-texture.png`) tiles `fixed` behind dark sections.
- **Transparency & blur:** the nav is glassy — `--surface-glass` (72% ink) + `--blur-sm`. Used for sticky chrome and overlays only.
- **Animation:** calm and atmospheric. Carousel cross-fades at `--dur-slow` (0.8s) on a 5s dwell. Hovers are `--dur-fast` (0.2s) color shifts; reveals `--dur-base` (0.3s). Default easing `--ease-out` (gentle settle). No bounces, no springy motion, no infinite decorative loops.
- **Hover / press:** links and nav go **bone → gold**; outlined buttons gain a gold border + gold text; cards lift slightly. Primary (solid gold) buttons brighten to `--gold-300`. Disabled drops to 40% opacity.

---

## ICONOGRAPHY

- **Approach:** sparse and utilitarian. The brand leans on **typography and imagery**, not iconography. There is no custom icon font.
- **What exists in the product:**
  - **Line SVG**, Lucide/Feather-style, 2px stroke, drawn in brand gold — e.g. the map-pin on job listings (`<path d="M21 10c0 7-9 13-9 13…"/>`). When you need UI glyphs, match this: **1.5–2px stroke, rounded caps/joins, `currentColor` or `--gold-500`.** A CDN set like **Lucide** (`https://unpkg.com/lucide-static`) is the closest match — flag if you pull it in.
  - **PNG social icons** shipped in the repo: `assets/icon-wechat.png`, `assets/icon-linkedin.png` (rendered in circular buttons that fill gold on hover).
  - **Logo PNGs:** `assets/logo-mark.png` (horizontal, nav), `assets/logo-center.png` (mark, hero) + the full lockup set (`logo-white-*`, `logo-black-*`, `logo-transparent-*`).
  - **Unicode as icon:** the gear `⚙` on the language toggle, `▼` expand chevron, `★` hero star-tier, `◈` cost diamond. Keep this minimal.
- **No emoji** anywhere in the brand.

---

## File index

| Path | What |
|---|---|
| `styles.css` | **Global entry** — `@import`s only. Consumers link this one file. |
| `tokens/fonts.css` | Webfont `@import`s (Google Fonts) |
| `tokens/colors.css` | Ink / bone / gold / jade ramps + semantic aliases |
| `tokens/typography.css` | Families, scale, weights, tracking |
| `tokens/spacing.css` | Spacing, radii, layout, container widths |
| `tokens/effects.css` | Shadows, gold glow, scrims, gradients, motion |
| `tokens/base.css` | Element resets + brand body treatment + `oc-` helpers |
| `guidelines/*.card.html` | 16 foundation specimen cards (Colors, Type, Spacing, Brand) |
| `components/core/` | `Button`, `Input`, `Badge`, `Tag`, `Card`, `Eyebrow`, `SectionHeading` |
| `components/navigation/` | `NavBar` |
| `components/game/` | `HeroCard` (auto-chess unit) |
| `components/site/` | `JobCard` (careers accordion) |
| `ui_kits/website/` | Interactive recreation of offcircle-studios.com (home + careers) |
| `assets/` | Logos, social icons, concept art, background texture |
| `SKILL.md` | Agent-Skill manifest for downstream use |

**Components** (use via `window.OffcircleDesignSystem_754ff1` after loading `_ds_bundle.js`):
`Button` · `Input` · `Badge` · `Tag` · `Card` · `Eyebrow` · `SectionHeading` · `NavBar` · `HeroCard` · `JobCard`

---

## Caveats & open questions

- **Fonts are a recommendation, not a license.** The studio had no brand typeface and used system defaults. This system proposes **Cormorant Garamond + Space Grotesk + Space Mono + Noto Serif/Sans SC** (all free, full CJK coverage, loaded from Google Fonts) to fit the lore-rich tonality. Swap in licensed brand fonts when chosen.
- **Jade as secondary accent** is extrapolated from the concept art (roof tiles), not yet a codified brand color — confirm before heavy use.
- The `HeroCard` auto-chess unit is a **forward-looking** component for the game demo; it follows the established visual language but has no live-product source yet.
