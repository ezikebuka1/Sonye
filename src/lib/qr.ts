import "server-only";
import { renderSVG } from "uqr";

// Server-only QR generator for the invite sheet. Renders an SVG of the absolute
// slot URL with ink #14304D modules on white and a 4-module quiet zone (the QR
// spec's required border). `uqr` is a zero-dependency library (survey in the
// dispatch ledger) imported SERVER-SIDE ONLY — the `server-only` guard fails the
// build if a client component ever imports this; the client island receives the
// finished SVG string as a prop, so `uqr` never reaches the browser bundle.
//
// #14304D is the dispatch-specified ink (the design `ink` token's value); it is
// a QR-generation parameter, not hand-authored styling, so the tokens-only rule
// for TSX/CSS does not apply here.
export function slotQrSvg(url: string): string {
  return renderSVG(url, {
    border: 4,
    blackColor: "#14304D",
    whiteColor: "#ffffff",
  });
}
