"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Pulls its child slightly toward the pointer. Fine pointers and motion-allowed only. */
export function Magnetic({ children, strength = 0.22 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ok =
      window.matchMedia("(pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ok) return;
    const target = el.firstElementChild as HTMLElement | null;
    if (!target) return;
    let raf = 0;
    const move = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * strength;
      const y = (e.clientY - (r.top + r.height / 2)) * strength;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        target.style.transform = `translate(${x}px, ${y}px)`;
      });
    };
    const leave = (): void => {
      cancelAnimationFrame(raf);
      target.style.transform = "";
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, [strength]);
  return (
    <span ref={ref} style={{ display: "inline-flex", padding: 6, margin: -6 }}>
      {children}
    </span>
  );
}
