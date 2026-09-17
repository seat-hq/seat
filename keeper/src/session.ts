/**
 * Market session clock.
 *
 * Copy sizing depends on the session. After-hours sizing is strictly smaller
 * than cash-session sizing. When the session cannot be determined we fail closed
 * (treat as closed / not tradable).
 *
 * Session boundaries are US equities in America/New_York. This is an
 * approximation for Phase 0 (it does not model holidays); it MUST be validated
 * against authoritative Robinhood Chain trading hours before live use.
 */

export type Session = "closed" | "pre_market" | "regular" | "after_hours";

export interface SessionPolicy {
  /** Size multiplier (bps of base copy size) during the regular session. */
  readonly regularBps: number;
  /** Size multiplier (bps) during pre-market. Must be < regularBps. */
  readonly preMarketBps: number;
  /** Size multiplier (bps) during after-hours. Must be < regularBps. */
  readonly afterHoursBps: number;
}

export interface SessionState {
  readonly session: Session;
  /** Size multiplier in bps applied to the base copy size (0 when closed). */
  readonly sizeMultiplierBps: number;
  /** Whether copies may execute in this session. */
  readonly tradable: boolean;
}

/** After-hours/pre-market are deliberately smaller than the regular session. */
export const DEFAULT_SESSION_POLICY: SessionPolicy = {
  regularBps: 10_000,
  preMarketBps: 3_000,
  afterHoursBps: 3_000,
};

interface WallClock {
  readonly weekday: number; // 0=Sun .. 6=Sat
  readonly minutes: number; // minutes since local midnight
}

function easternWallClock(now: Date): WallClock | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (t: string): string =>
      parts.find((p) => p.type === t)?.value ?? "";
    const weekdayMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const weekday = weekdayMap[get("weekday")];
    if (weekday === undefined) return null;
    let hour = Number(get("hour"));
    if (hour === 24) hour = 0; // some ICU builds emit 24 for midnight
    const minute = Number(get("minute"));
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    return { weekday, minutes: hour * 60 + minute };
  } catch {
    return null;
  }
}

const PRE_OPEN = 4 * 60; // 04:00
const REG_OPEN = 9 * 60 + 30; // 09:30
const REG_CLOSE = 16 * 60; // 16:00
const AFTER_CLOSE = 20 * 60; // 20:00

function classify(clock: WallClock): Session {
  if (clock.weekday === 0 || clock.weekday === 6) return "closed";
  const m = clock.minutes;
  if (m >= REG_OPEN && m < REG_CLOSE) return "regular";
  if (m >= PRE_OPEN && m < REG_OPEN) return "pre_market";
  if (m >= REG_CLOSE && m < AFTER_CLOSE) return "after_hours";
  return "closed";
}

function multiplierFor(session: Session, policy: SessionPolicy): number {
  switch (session) {
    case "regular":
      return policy.regularBps;
    case "pre_market":
      return policy.preMarketBps;
    case "after_hours":
      return policy.afterHoursBps;
    case "closed":
      return 0;
  }
}

/**
 * Resolve the session state for a moment in time. Fails closed to
 * `closed`/not-tradable if the wall clock cannot be determined.
 */
export function getSessionState(
  now: Date,
  policy: SessionPolicy = DEFAULT_SESSION_POLICY,
): SessionState {
  const clock = easternWallClock(now);
  if (clock === null) {
    return { session: "closed", sizeMultiplierBps: 0, tradable: false };
  }
  const session = classify(clock);
  const sizeMultiplierBps = multiplierFor(session, policy);
  return {
    session,
    sizeMultiplierBps,
    tradable: session !== "closed" && sizeMultiplierBps > 0,
  };
}
