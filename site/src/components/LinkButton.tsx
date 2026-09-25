import Link from "next/link";
import type { ReactNode } from "react";
import { links, unpublishedLabel, type LinkKey } from "@/lib/links";
import { Magnetic } from "@/motion/Magnetic";

type Variant = "primary" | "ghost";
type Dir = "right" | "down" | "up-right";

interface Props {
  readonly href?: string;
  readonly to?: LinkKey;
  readonly variant?: Variant;
  readonly dir?: Dir;
  readonly children?: ReactNode;
  readonly magnetic?: boolean;
}

const ARROW: Record<Dir, string> = { right: "→", down: "↓", "up-right": "↗" };

/** A button-styled link. Unpublished destinations render as a disabled state. */
export function LinkButton({ href, to, variant = "ghost", dir = "right", children, magnetic = true }: Props) {
  const entry = to ? links[to] : null;
  const target = href ?? entry?.href ?? null;
  const external = entry?.external ?? (target ? /^https?:/.test(target) : false);
  const label = children ?? entry?.label;
  const cls = `btn btn--${variant}`;
  const arrowDir: Dir = external ? "up-right" : dir;

  if (!target) {
    return (
      <span className={cls} aria-disabled="true" role="link" title="Not published yet">
        {label} <span className="tbd">{unpublishedLabel}</span>
      </span>
    );
  }

  const inner = (
    <>
      {label}
      <span className="arrow" aria-hidden="true">
        {ARROW[arrowDir]}
      </span>
      {external ? <span className="sr-only">(opens in a new tab)</span> : null}
    </>
  );

  const el = external ? (
    <a className={cls} href={target} target="_blank" rel="noopener noreferrer" data-dir={arrowDir}>
      {inner}
    </a>
  ) : (
    <Link className={cls} href={target} data-dir={arrowDir}>
      {inner}
    </Link>
  );

  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}
