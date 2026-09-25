"use client";

import { useRef, type ElementType } from "react";
import { useGsap } from "./hooks";

interface Props {
  readonly text: string;
  readonly as?: ElementType;
  readonly className?: string;
  /** Words wrapped in *asterisks* get the accent class. */
  readonly accentClass?: string;
}

/** Words brighten one by one as the block scrolls through the viewport. */
export function ScrubWords({ text, as: Tag = "p", className, accentClass = "c-desk" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const words = text.split(/\s+/);

  useGsap(
    ref,
    ({ gsap }) => {
      gsap.fromTo(
        "[data-w]",
        { opacity: 0.14, filter: "blur(3px)" },
        {
          opacity: 1,
          filter: "blur(0px)",
          stagger: 0.08,
          ease: "none",
          scrollTrigger: { trigger: ref.current, start: "top 82%", end: "bottom 45%", scrub: 0.6 },
        },
      );
    },
    [text],
  );

  return (
    <Tag ref={ref} className={className}>
      {words.map((w, i) => {
        const accent = /^\*.*\*[.,?!…]*$/.test(w);
        const clean = accent ? w.replace(/\*/g, "") : w;
        return (
          <span key={i} data-w className={accent ? accentClass : undefined} style={{ display: "inline-block" }}>
            {clean}
            {i < words.length - 1 ? "\u00a0" : ""}
          </span>
        );
      })}
    </Tag>
  );
}
