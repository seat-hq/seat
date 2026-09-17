# ABIs

Contract ABIs are produced by Foundry into `../../out/<Contract>.sol/<Contract>.json`
when you run `forge build`. The app does not vendor ABIs in Phase 0 because there
is no live deployment to read.

When Phase 1 adds on-chain reads:

1. Deploy to testnet and record addresses in `src/lib/addresses.ts`.
2. Import the needed ABI from the Foundry `out/` artifacts (or copy the minimal
   ABI fragment here).
3. Wire reads through the wagmi config in `src/lib/wagmi.ts`.

Do not hand-write or fabricate ABIs/addresses.
