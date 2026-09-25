import styles from "./TwoPiles.module.css";

/** The closing visual sentence of the story. Plain text, readable without motion. */
export function TwoPiles({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={styles.fig} data-compact={compact} aria-label="The two piles are separate">
      <div className={styles.piles}>
        <div className={styles.pile} data-side="alex">
          <p className={styles.name}>Alex&apos;s wallet</p>
          <p className={styles.what}>his key, his money</p>
          <p className={styles.rule}>you cannot spend this</p>
        </div>
        <div className={styles.gap} aria-hidden="true">
          <span />
        </div>
        <div className={styles.pile} data-side="desk">
          <p className={styles.name}>Desk vault</p>
          <p className={styles.what}>your USDG + copies</p>
          <p className={styles.rule}>your shares claim this NAV</p>
        </div>
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.l1}>The piles are separate.</span>
        <span className={styles.l2}>The desk can still lose money on the copy.</span>
        <span className={styles.l3}>Separation is about custody, not about Alex being right.</span>
      </figcaption>
    </figure>
  );
}
