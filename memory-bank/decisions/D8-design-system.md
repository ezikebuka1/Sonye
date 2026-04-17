# D8 — Design System

**Decided:** 2026-04-17
**Status:** Approved. Replaces the blue+black design system.
**Aesthetic name:** "Pickup Ready"

## Summary

SquadUp's visual identity sits between Playtomic (too corporate) and Timeleft (too events-focused). The direction is: casual but polished, active but not gamer, personal but not pastel. It should feel like getting invited to play by a friend who has good taste.

## Color Tokens

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| bg-page | `#EEF4FA` | Page background — soft blue wash |
| bg-card | `#FFFFFF` | Card surfaces |
| bg-card-inset | `#F6F9FC` | Inset areas within cards (venue line, secondary info) |
| bg-status-banner | `#FFF0EB` | Status/notification banners (warm tint) |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| text-primary | `#1A3650` | Headings, names, key information — dark navy |
| text-secondary | `#7A9AB8` | Labels, timestamps, supporting text — steel blue |
| text-muted | `#A8C4DB` | Inactive nav items, placeholder text |
| text-venue | `#4A7A9E` | Venue names inside inset areas |

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| accent-coral | `#D4724A` | Primary action buttons ("Join game"), hero accent text, active nav icon. Used in exactly 2-3 places per screen — never more. |
| accent-coral-dark | `#B85D3A` | Hover/active state for coral buttons |
| accent-coral-light | `#E8997E` | Secondary coral (avatar variant) |
| accent-coral-bg | `#FFF0EB` | Coral-tinted backgrounds (banners, icon backgrounds) |

### Borders
| Token | Hex | Usage |
|-------|-----|-------|
| border-card | `#DAE7F1` | Card borders — 0.5px solid |
| border-subtle | `#C5D9ED` | Notification bell, secondary borders |

### Skill Level Badges
| Level | Background | Text |
|-------|-----------|------|
| Beginner | `#E0EEF9` | `#0C447C` |
| Advanced beginner | `#FAF0DC` | `#854F0B` |
| Intermediate | `#E8F5E9` | `#27500A` |
| Advanced | `#FBEAF0` | `#72243E` |

### Avatar Colors
Avatars use the blue palette only — never coral. Coral is reserved for actions.
| Variant | Hex |
|---------|-----|
| avatar-dark | `#1A3650` |
| avatar-mid | `#3A7CB8` |
| avatar-light | `#5A9FD4` |

## Typography

| Role | Font | Weight | Size |
|------|------|--------|------|
| Hero headline | DM Sans | 500 | 32px |
| Hero accent word | Instrument Serif | 400 italic | 32px (same as headline) |
| Section headers | DM Sans | 600 | 11px uppercase, letter-spacing 0.08em |
| Card title (day/time) | DM Sans | 600 | 18px |
| Card label (sport) | DM Sans | 500 | 11px uppercase |
| Body text | DM Sans | 500 | 13-14px |
| Greeting name | DM Sans | 600 | 26px |
| Greeting time-of-day | DM Sans | 500 | 14px |

**Rules:**
- Instrument Serif italic is used for exactly ONE word or short phrase per screen — the emotional anchor. On home: "squad." On other screens: TBD per sketch approval.
- No serif anywhere else. DM Sans handles everything.
- No font weights above 600. Nothing should feel heavy.
- Google Fonts import: `DM Sans:opsz,wght@9..40,400;9..40,500;9..40,600` and `Instrument Serif:ital@0;1`

## Component Patterns

### Slot Card
- White background, 20px border-radius, 20px padding
- 0.5px solid `#DAE7F1` border
- Sport icon: 44x44px, 14px border-radius, warm gradient background (peach for first skill tier, golden for second, etc.)
- Skill badge: pill shape, colored per skill level table above
- Day/time as the hero text (18px, 600 weight) — this is the primary decision the user is making
- Venue in an inset area (`#F6F9FC` background, 12px border-radius)
- Bottom row: avatars + count on left, "Join game" button on right

### 50% Fill Threshold Rule
- When slot fill is **below 50%** of capacity: card shows ONLY the Join button in the bottom row. No avatars, no count. Card looks clean and available.
- When slot fill is **at or above 50%**: card shows avatar stack + "X/Y spots filled" alongside the Join button. Social proof appears when it's credible.
- Reasoning: "1/6 spots filled" makes a game look dead and discourages opt-ins. "3/6" creates momentum and urgency. Below 50%, silence is better than a small number.

### Join Button
- Background: `#D4724A` (accent-coral)
- Text: white, 15px, 600 weight
- Padding: 12px 28px
- Border-radius: 14px
- Label: "Join game" (two words — "game" does emotional work)

### Greeting Section
- Time-of-day line: "Good morning" / "Good afternoon" / "Good evening" in text-secondary
- Name line: "Hey [Name]" in 26px/600 text-primary
- Notification bell: 44px circle, white background, subtle border

### Hero Text
- "Find your" in text-primary (DM Sans 500, 32px)
- "[accent word]." in accent-coral (Instrument Serif italic 400, 32px)
- Line break between them. Period after the accent word.

### Social Proof Strip
- Row of 4 small avatar dots (22px, mixed colors from avatar palette)
- Text: "[count] players active in [city] this week"
- Count in text-primary/600, rest in text-secondary/400
- Sits between hero text and card list

### Bottom Tab Bar
- White background, 0.5px top border
- Three tabs: Home, Squad, Profile
- Active tab: coral icon + coral label
- Inactive tab: muted blue icon + muted label
- Bottom padding: 28px (safe area for phones with home indicator)

## What This System Is NOT
- Not dark mode. The soft blue wash is the foundation.
- Not neon. Coral is saturated but organic, not electric.
- Not corporate. No enterprise blue-gray. No dense information cards.
- Not minimal/empty. Cards have real content density. The screen should feel populated.
- Not cluttered. One card type, repeated. No icons-for-the-sake-of-icons.

## Process Note
All visual changes must go through the architect session as sketches before Code implements them. This is the Sketches Before Code rule from D7/systemPatterns.md. D8 defines the palette and components; individual screen layouts are approved per-screen via sketch iteration.
