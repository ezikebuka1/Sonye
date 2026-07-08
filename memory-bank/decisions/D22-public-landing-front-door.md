# D22 — Public landing front door (Option B)

**Decision (2026-07-02).** Anonymous `/` renders a marketing landing that embeds
the live public feed as its "This week in Dallas" section. Authed routing is
unchanged (session → HomeClient). No `/games` route in v1 (public browse-all
stays banked in v2-signals; revisit if the landing and browsing ever conflict).

**Rationale.** Cold visitors (bio links, word of mouth) need context before a
schedule means anything; the share-link funnel (`/slot/<id>`) bypasses `/`
entirely, so the Partiful density funnel is untaxed; a sparse or empty feed is a
weak first impression pre-density. One page, zero added taps: the pitch scrolls
into the payoff.

**Structure (in order).** Top bar (wordmark · dallas pill · Log in → /auth) ·
hero photo slot · rotating headline over real inventory + constant coral "your
squad." · coral CTA "See this week's games" (anchor-scroll) · manifesto · three
overlapping polaroid photo slots · how-it-works (3 rows, photo thumbs) · This
week in Dallas (live feed section) · testimonials (placeholder state) · stats
band · FAQ (native details/summary) · ink closing band · footer Privacy · Terms.

The games section consumes an extracted `PublicFeedList` (the public-feed RPC
fetch + card list; empty-state copy passed as a prop; `PublicSlotCard`
shared-by-import, never copied — D20 isolation holds). The old standalone
`PublicFeed` shell is deleted once orphaned by this change.

**D8.2 amendments.** Secondary text at body sizes darkens to `#4A6B8C` for WCAG
AA (steel `#5E80A3` remains for large/decorative text). Coral gains a hover/
active state `#D95500`. Both enter globals.css as tokens.

**Content rules (hard).** Photos: the owner's real photos only; labeled dashed
placeholders until supplied (manifest-driven swap, no code change beyond paths).
Testimonials: render ONLY the honest placeholder copy below until real,
permissioned quotes exist — "This spot is saved for a real player's words —
we'd rather leave it empty than invent them." / "Someone who actually played
the Saturday games at Cole Park will get this card." Stats: true numbers only,
server-rendered in HTML (12 · 3 · 6 as owner-maintained constants for v1).
Voice: host-neutral, sentence case, no exclamation marks.

**Motion.** Rotator ~3s fade-slide cycling real inventory inside a descriptive
h1; polaroid idle sway ±1.5°; sections fade-up once (IntersectionObserver);
stats count-up and hero Ken Burns as ENHANCEMENTS over server-rendered finals.
Everything disabled under prefers-reduced-motion. CSS-first; no animation
libraries; one small client island.

**Accessibility.** Descriptive h1 wrapping the rotator; native details/summary
FAQ; alt-text canon = the photo shot-list; focus-visible on all interactive
elements; targets ≥44px; static-first numbers.

**Rejected (recorded).** Runtime React/Babel/CDN delivery, base64 font
embedding, self-extracting wrappers (from the external design loop's export);
stock people photography; fabricated quotes or numbers.

**Provenance.** v2 sketch → external design loop (Claude design / ChatGPT
review) → artifact decoded + audited 2026-07-02; the loop's AA contrast fix and
testimonial copy were folded in; its delivery mechanism was rejected.
