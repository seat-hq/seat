"use client";

import { CHAIN } from "@seat/sdk";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { getAddresses } from "@/lib/addresses";

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function WalletBar() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injected = connectors[0];

  if (!isConnected) {
    return (
      <button
        className="btn btn-on"
        disabled={!injected || isPending}
        onClick={() => injected && connect({ connector: injected })}
        type="button"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="wallet-bar">
      <span className="mono">{shortAddr(address ?? "")}</span>
      {chainId === CHAIN.MAINNET_ID ? (
        getAddresses(CHAIN.MAINNET_ID).deskVault ? (
          <span className="ok-text">mainnet 4663 — $50k cap</span>
        ) : (
          <span className="warn-text">mainnet 4663 — desk not wired</span>
        )
      ) : chainId !== CHAIN.TESTNET_ID ? (
        <button
          className="btn btn-on"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: CHAIN.TESTNET_ID })}
          type="button"
        >
          Switch to 46630
        </button>
      ) : (
        <span className="ok-text">testnet 46630</span>
      )}
      <button className="btn btn-on" onClick={() => disconnect()} type="button">
        Disconnect
      </button>
    </div>
  );
}
