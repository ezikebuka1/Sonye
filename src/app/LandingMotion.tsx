"use client";

import { useEffect } from "react";
import { ROTATOR } from "./landing-content";

// D22 — the ONE client island. It ONLY animates finals that are ALREADY in the
// server HTML: the first rotator phrase, the final stat numbers, and the fully
// visible sections all render without JS. Under prefers-reduced-motion it does
// nothing at all (static-first): no rotation, no count-up, no sway, no Ken
// Burns, native (instant) anchor jumps.
//
// Mechanism: the island adds `.landing-js` to #landing-root ONLY when motion is
// allowed. All the "hide then reveal / sway / ken-burns" CSS is scoped to
// `#landing-root.landing-js ...`, so with no JS (or reduced motion) every
// element keeps its visible, un-animated final state.

export default function LandingMotion() {
  useEffect(() => {
    const root = document.getElementById("landing-root");
    if (!root) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return; // static-first: leave every server final as-is

    root.classList.add("landing-js");
    const cleanups: Array<() => void> = [];

    // 1. Rotator — fade-slide the "when + where" phrase every ~3s.
    const rot = root.querySelector<HTMLElement>("[data-rotator]");
    if (rot && ROTATOR.length > 1) {
      let i = 0;
      const swap = window.setInterval(() => {
        i = (i + 1) % ROTATOR.length;
        rot.classList.add("is-swapping");
        window.setTimeout(() => {
          rot.textContent = ROTATOR[i];
          rot.classList.remove("is-swapping");
        }, 260);
      }, 3000);
      cleanups.push(() => window.clearInterval(swap));
    }

    // 2. Sections fade-up once as they enter the viewport.
    const revealEls = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
    if ("IntersectionObserver" in window && revealEls.length) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
              obs.unobserve(e.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
      );
      revealEls.forEach((el) => io.observe(el));
      cleanups.push(() => io.disconnect());
    }

    // 3. Stats count-up (enhancement over the server-rendered final). The stat
    // band sits far below the fold, so resetting to 0 up front is invisible;
    // the ramp runs when it scrolls into view.
    const countEls = Array.from(
      root.querySelectorAll<HTMLElement>("[data-countup]"),
    );
    if ("IntersectionObserver" in window && countEls.length) {
      countEls.forEach((el) => {
        el.textContent = "0";
      });
      const cio = new IntersectionObserver(
        (entries, obs) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const el = e.target as HTMLElement;
            obs.unobserve(el);
            const final = parseInt(el.dataset.final ?? "0", 10);
            const duration = 900;
            let startTs: number | null = null;
            const tick = (ts: number) => {
              if (startTs === null) startTs = ts;
              const p = Math.min((ts - startTs) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              el.textContent = String(Math.round(eased * final));
              if (p < 1) requestAnimationFrame(tick);
              else el.textContent = String(final);
            };
            requestAnimationFrame(tick);
          }
        },
        { threshold: 0.6 },
      );
      countEls.forEach((el) => cio.observe(el));
      cleanups.push(() => cio.disconnect());
    }

    // 4. Smooth in-page anchor scroll (the CTA -> #games). Without this handler
    // the native <a href="#games"> still jumps instantly, so it works with no
    // JS and under reduced motion.
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const dest = document.getElementById(href.slice(1));
      if (!dest) return;
      ev.preventDefault();
      dest.scrollIntoView({ behavior: "smooth", block: "start" });
      // Move focus so keyboard users land in the section too (a11y).
      dest.setAttribute("tabindex", "-1");
      dest.focus({ preventScroll: true });
    };
    root.addEventListener("click", onClick);
    cleanups.push(() => root.removeEventListener("click", onClick));

    return () => {
      cleanups.forEach((fn) => fn());
      root.classList.remove("landing-js");
    };
  }, []);

  return null;
}
