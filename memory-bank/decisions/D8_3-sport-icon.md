# D8.3 — Sport Icon on the Slot Card
Decided: 2026-06-13 · Status: Approved (Gemini cross-checked)

Decision: replace the lucide `Activity` glyph + coral chip in the slot-card Row 1
with a bare orange pickleball paddle-and-ball mark on the white card + a
"Pickleball" text label. Ships as a currentColor SVG component (PickleballIcon),
ball holes knocked out transparent. Call-site color: D8.2 decorative orange #FF6A00.

Rationale: Activity read as medical. Bare (no chip) because v1 is single-sport
(D7 hardcodes pickleball) — no varied-icon alignment a container would solve, and
D8 forbids icons-for-the-sake-of-icons. No orange chip: orange is the action color;
a filled orange chip above the orange CTA would split the action signal (D8: accent
reserved for actions, 2-3/screen). Paddle sized to stay subordinate to the CTA.

Scope boundary: icon only. Join-button coral->orange recolor + Home D8.2 re-skin
deferred to that task; NOT touched here.

V2 breadcrumb: when a 2nd sport lands and rows need uniform icon alignment,
containerize the sport icon in a page-blue tile (#E6F0FF), never orange.
