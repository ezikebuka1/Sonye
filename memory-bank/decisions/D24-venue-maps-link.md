# D24 — Venue maps link (courts coordinates)
Status: DECIDED 2026-07-15
Decision: venues gains nullable court coordinates (lat/lng, double
precision; range CHECKs; paired-null CHECK). Exposed to the anon slot
page by appending venue_lat, venue_lng as the LAST two columns of
slot_share_preview (D12 append-last precedent; grants re-asserted).
UI: the venue line on /slot/[id] and the lobby becomes a plain
server-rendered <a> to a universal Google Maps link —
https://www.google.com/maps/search/?api=1&query=<lat>%2C<lng> —
target="_blank" rel="noopener noreferrer", for ALL platforms including
iPhone (product ruling: Google Maps for everyone; no Apple Maps, no
UA branching). NULL coords → plain text, no link. Steel treatment per
approved sketch; coral stays actions-only.
Rejected: UA-sniffed Apple/Google split (brittle, kills page caching);
address strings (pins the park, not the courts — "Lake Highlands North
Park" name-query mis-resolved to Walne Park as evidence); stored
maps_url blob (welds one provider into the DB; coords stay
provider-agnostic and serve future willing_to_drive logic).
Credit: Gemini pressure-test rejected the address/UA shape; coordinates
refinement + Google-for-all are Ebuka/Architect rulings on top.
Acceptance: tap-test all three venue pins; Churchill seeded from the
park pin pending Ebuka's courts-level nudge.
