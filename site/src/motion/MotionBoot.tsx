"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Observes [data-reveal] elements and adds .is-in once they enter the viewport.
 * `.js-motion` is set on <html> by an inline head script only when motion is allowed,
 * so without JS or with reduced motion everything is visible immediately.
 */
export function MotionBoot() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("js-motion")) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (): void => {
      if (mq.matches) {
        root.classList.remove("js-motion");
        io.disconnect();
      }
    };
    mq.addEventListener("change", onChange);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", onChange);
    };
  }, [pathname]);

  return null;
}

export const motionHeadScript = `(function(){try{if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('js-motion')}}catch(e){}})();`;
