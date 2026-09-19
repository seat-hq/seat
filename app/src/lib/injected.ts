/**
 * Injected wallet only — do not import `wagmi/connectors`.
 * That barrel re-exports Coinbase Base Account, which pulls
 * `@coinbase/cdp-sdk` → missing `@x402/evm/upto/client` under Next.js.
 *
 * Resolved via next.config.mjs webpack alias (package exports block dist/).
 */
export { injected } from "@seat/injected-connector";
