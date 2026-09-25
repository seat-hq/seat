"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./hooks";

interface CountUpProps {
  readonly value: number;
  readonly digits?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  readonly duration?: number;
  readonly signed?: boolean;
  readonly className?: string;
}

const fmt = (n: number, digits: number, signed: boolean): string => {
  const s = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  if (n < 0) return `−${s}`;
  return signed && n > 0 ? `+${s}` : s;
};

/** Interpolates from the previous value to the new one. Text is always the real number at rest. */
export function CountUp({
  value,
  digits = 0,
  prefix = "",
  suffix = "",
  duration = 900,
  signed = false,
  className,
}: CountUpProps) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduced !== false) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return;
    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - t, 4);
      setShown(a + (b - a) * e);
      if (t < 1) raf.current = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
      from.current = b;
    };
  }, [value, duration, reduced]);

  return (
    <span className={className} data-value={value}>
      {prefix}
      {fmt(shown, digits, signed)}
      {suffix}
    </span>
  );
}
