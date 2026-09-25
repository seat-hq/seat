---
title: Constants & Errors
description: The CHAIN constant, NavError codes, and the shared types — the small print of @seat/sdk.
order: 4
---

## `CHAIN`

```ts
export const CHAIN = {
  MAINNET_ID: 4663,
  TESTNET_ID: 46630,
  GAS_ASSET: "ETH",
  ACCOUNTING_ASSET: "USDG",
  DEPOSIT_CAP_USDG: 50_000n * 1_000_000n,  // 50,000 USDG in base units
} as const;
```

Chain IDs come from the project specification; RPC endpoints are always supplied via environment variables, never hardcoded into the SDK. `DEPOSIT_CAP_USDG` is the per-desk mainnet cap from the project docs.

## `NavError`

Structured error for every NAV validation failure:

```ts
class NavError extends Error {
  readonly code: NavErrorCode;
}
type NavErrorCode =
  | "INVALID_DECIMALS"   // decimals outside [0, 36] or non-integer
  | "NEGATIVE_VALUE"     // negative cash / balance / shares / liabilities
  | "ZERO_PRICE"         // price ≤ 0
  | "STALE_PRICE"        // price age outside maxStalenessSec, or now missing
  | "DIVIDE_BY_ZERO";
```

Recommended handling:

```ts
import { NavError, calculateNav } from "@seat/sdk";

try {
  const nav = calculateNav(cash, positions, { now, maxStalenessSec: 120 });
} catch (err) {
  if (err instanceof NavError) {
    // fail closed: do not trade or display a NAV you cannot stand behind
    console.warn("NAV unavailable:", err.code, err.message);
  } else {
    throw err;
  }
}
```

## Shared types

| Type | Used by |
|---|---|
| `Address` (`0x${string}`) | Registry rows and lookups |
| `OfficialStockToken`, `VerificationState` | Registry |
| `PriceData`, `Position`, `NavOptions`, `NavResult` | NAV math |
| `NavErrorCode` | Error handling |

## Versioning note

The SDK is `0.0.0` and private to the monorepo. There is no published-version compatibility surface yet; the contracts and the SDK move together in one repo, which is itself the compatibility guarantee for now. When the protocol versions, this page will track per-version registry and math changes.
