"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function getGsap(): { gsap: typeof gsap; ScrollTrigger: typeof ScrollTrigger } {
  if (!registered && typeof window !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({
      ignoreMobileResize: true,
      // Resize refresh fights React reconciliation when pins are active — refresh manually if needed.
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
    });
    gsap.defaults({ ease: "expo.out", duration: 0.8 });
    registered = true;
  }
  return { gsap, ScrollTrigger };
}

export const ease = {
  out: "expo.out",
  inOut: "power3.inOut",
  snap: "back.out(1.6)",
} as const;
