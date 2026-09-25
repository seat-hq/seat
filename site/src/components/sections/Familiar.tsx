import { ScrubWords } from "@/motion/ScrubWords";
import styles from "./Familiar.module.css";

export function Familiar() {
  return (
    <section id="project" className={`sec ${styles.sec}`} aria-labelledby="familiar-title">
      <div className="wrap">
        <p className="eyebrow">
          <b>01</b> The hook
        </p>
        <h2 id="familiar-title" className={`display ${styles.first}`}>
          Everyone knows how wallet copy trading works.
        </h2>
        <p className={styles.sub}>Pick a wallet you trust. Mirror what it does. It&apos;s a good idea, and it&apos;s familiar.</p>
        <ScrubWords
          className={`display ${styles.turn}`}
          text="But what if you stopped copying a wallet…"
        />
        <ScrubWords
          className={`display ${styles.punch}`}
          text="…and started joining a *desk?*"
        />
      </div>
    </section>
  );
}
