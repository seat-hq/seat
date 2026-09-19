declare module "@seat/injected-connector" {
  import type { CreateConnectorFn } from "@wagmi/core";
  export function injected(parameters?: {
    shimDisconnect?: boolean;
  }): CreateConnectorFn;
}
