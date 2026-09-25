"use client";

import { useEffect, useLayoutEffect, useState, type DependencyList, type RefObject } from "react";
import { getGsap } from "./gsap";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const QUERY = "(prefers-reduced-motion: reduce)";

/** `null` until mounted, so server output never assumes a preference. */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const update = (): void => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useMediaQuery(query: string): boolean | null {
  const [match, setMatch] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = (): void => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}

/**
 * Runs `setup` inside a scoped gsap.context and reverts everything on cleanup.
 * `setup` only runs when motion is allowed.
 */
export function useGsap(
  scope: RefObject<HTMLElement | SVGElement | null>,
  setup: (tools: ReturnType<typeof getGsap>) => void | (() => void),
  deps: DependencyList,
): void {
  const reduced = useReducedMotion();
  useIsoLayoutEffect(() => {
    if (reduced !== false || !scope.current) return;
    const tools = getGsap();
    let extra: void | (() => void);
    const ctx = tools.gsap.context(() => {
      extra = setup(tools);
    }, scope.current);
    return () => {
      if (typeof extra === "function") extra();
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);
}

/** True while the element is on screen. Used to pause loops that are off screen. */
export function useInView(ref: RefObject<Element | null>, rootMargin = "0px"): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      rootMargin,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
