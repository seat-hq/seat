"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { evaluate, GATE_LABEL, GATE_ORDER, sampleTrades, type GateState } from "@/lib/risk";
import { useReducedMotion } from "@/motion/hooks";
import { usd } from "@/lib/story";
import styles from "./RiskMachine.module.css";

const STEP_MS = 420;

export function RiskMachine() {
  const [tradeId, setTradeId] = useState(sampleTrades[0]!.id);
  const [step, setStep] = useState(GATE_ORDER.length + 1);
  const reduced = useReducedMotion();
  const timer = useRef<number | null>(null);

  const trade = sampleTrades.find((t) => t.id === tradeId) ?? sampleTrades[0]!;
  const result = useMemo(() => evaluate(trade.input), [trade]);
  const stopAt = result.gates.findIndex((g) => g.state === "fail");
  const lastStep = stopAt === -1 ? GATE_ORDER.length : stopAt + 1;
  const done = step > lastStep;

  const run = (id: string): void => {
    setTradeId(id);
    if (timer.current) window.clearInterval(timer.current);
    if (reduced !== false) {
      setStep(GATE_ORDER.length + 1);
      return;
    }
    setStep(0);
    let s = 0;
    timer.current = window.setInterval(() => {
      s += 1;
      setStep(s);
      if (s > GATE_ORDER.length) {
        if (timer.current) window.clearInterval(timer.current);
      }
    }, STEP_MS);
  };

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  const gateState = (i: number): GateState | "active" => {
    const g = result.gates[i];
    if (!g) return "idle";
    if (step < i + 1) return step === i ? "active" : "idle";
    return g.state;
  };

  const tokenPos = Math.min(step, lastStep);

  return (
    <div className={styles.machine}>
      <fieldset className={styles.picker}>
        <legend className="mono">Send a trade into the desk</legend>
        {sampleTrades.map((t) => (
          <label key={t.id} className={styles.option} data-on={t.id === tradeId}>
            <input
              type="radio"
              name="risk-trade"
              value={t.id}
              checked={t.id === tradeId}
              onChange={() => run(t.id)}
            />
            <span className={styles.optLabel}>{t.label}</span>
            <span className={`mono ${styles.optSize}`}>{usd(t.input.sizeUsdg)}</span>
          </label>
        ))}
      </fieldset>

      <div className={styles.pipeline}>
        <div className={styles.lane} style={{ "--pos": tokenPos, "--n": GATE_ORDER.length } as React.CSSProperties}>
          <span
            className={styles.token}
            data-outcome={done ? result.outcome : "pending"}
            data-shrunk={done && result.outcome === "RESIZE"}
            aria-hidden="true"
          >
            {trade.input.symbol}
          </span>
        </div>
        <ol className={styles.gates}>
          {GATE_ORDER.map((id, i) => {
            const st = gateState(i);
            const g = result.gates[i];
            return (
              <li key={id} className={styles.gate} data-state={st}>
                <span className={styles.gateLight} aria-hidden="true" />
                <span className={`mono ${styles.gateName}`}>{GATE_LABEL[id]}?</span>
                <span className={styles.gateNote}>{st === "idle" || st === "active" ? "…" : g?.note}</span>
              </li>
            );
          })}
        </ol>
        <div className={styles.outcome} data-outcome={result.outcome} data-done={done} aria-live="polite">
          {done ? (
            <>
              <p className={`mono ${styles.outcomeWord}`}>{result.outcome}</p>
              <p className={styles.outcomeReason}>{result.reason}</p>
              {result.allowedSizeUsdg > 0 ? (
                <p className={`mono ${styles.outcomeSize}`}>
                  requested {usd(trade.input.sizeUsdg)} → desk trades {usd(result.allowedSizeUsdg)} USDG
                </p>
              ) : (
                <p className={`mono ${styles.outcomeSize}`}>nothing reaches the vault</p>
              )}
            </>
          ) : (
            <p className={`mono ${styles.outcomeWord} ${styles.outcomePending}`}>evaluating…</p>
          )}
        </div>
      </div>
    </div>
  );
}
