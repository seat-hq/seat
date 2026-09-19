"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CHAIN } from "@seat/sdk";
import { decodeEventLog, parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { deskVaultAbi, erc20Abi } from "@/abis";
import { Badge } from "@/components/Badge";
import { WalletBar } from "@/components/WalletBar";
import { canWriteOnChain, getAddresses } from "@/lib/addresses";
import { PAPER_DESK, formatNav } from "@/lib/desks";
import { parseUsdgField, type RecordedFill } from "@/lib/fills";

function sessionTone(
  session: string,
): "green" | "warn" | "muted" {
  if (session === "regular") return "green";
  if (session === "after_hours" || session === "pre_market") return "warn";
  return "muted";
}

function shortAddr(addr: string): string {
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function sourceTone(source: RecordedFill["source"]): "green" | "muted" {
  return source === "chain" ? "green" : "muted";
}

export function DeskBlotter() {
  const testnet = getAddresses(CHAIN.TESTNET_ID);
  const vault = testnet.deskVault;
  const onChain = vault !== null;
  const { address, isConnected } = useAccount();
  const walletChain = useChainId();
  const publicClient = usePublicClient({ chainId: CHAIN.TESTNET_ID });
  const { writeContractAsync } = useWriteContract();

  const canWrite =
    isConnected && canWriteOnChain(walletChain, testnet) && Boolean(address);

  const readEnabled = onChain;
  const userEnabled = onChain && Boolean(address);

  const { data: leader } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "leader",
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: readEnabled },
  });
  const { data: totalAssets, refetch: refetchAssets } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "totalAssetsUsdg",
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: readEnabled },
  });
  const { data: totalShares, refetch: refetchShares } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "totalShares",
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: readEnabled },
  });
  const { data: navShare, refetch: refetchNav } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "navPerShare",
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: readEnabled },
  });
  const { data: cash, refetch: refetchCash } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "cashUsdg",
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: readEnabled },
  });
  const { data: userShares, refetch: refetchUser } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "sharesOf",
    args: address ? [address] : undefined,
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: userEnabled },
  });
  const { data: queueLen, refetch: refetchQueue } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "withdrawQueueLength",
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: readEnabled },
  });
  const { data: assetFromVault } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "asset",
    chainId: CHAIN.TESTNET_ID,
    query: { enabled: readEnabled && testnet.usdg === null },
  });

  const usdg =
    testnet.usdg ??
    (typeof assetFromVault === "string" ? (assetFromVault as `0x${string}`) : null);

  const [depositAmt, setDepositAmt] = useState("");
  const [redeemAmt, setRedeemAmt] = useState("");
  const [busy, setBusy] = useState<"idle" | "approve" | "deposit" | "redeem">("idle");
  const [note, setNote] = useState<string | null>(null);
  const [fills, setFills] = useState<RecordedFill[]>([]);

  const loadFills = useCallback(async () => {
    try {
      const res = await fetch("/api/fills", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { fills?: RecordedFill[] };
      setFills(Array.isArray(json.fills) ? json.fills : []);
    } catch {
      setFills([]);
    }
  }, []);

  useEffect(() => {
    void loadFills();
  }, [loadFills]);

  const refreshVault = useCallback(async () => {
    await Promise.all([
      refetchAssets(),
      refetchShares(),
      refetchNav(),
      refetchCash(),
      refetchUser(),
      refetchQueue(),
    ]);
    await loadFills();
  }, [
    loadFills,
    refetchAssets,
    refetchCash,
    refetchNav,
    refetchQueue,
    refetchShares,
    refetchUser,
  ]);

  const asBig = (value: unknown): bigint | null =>
    typeof value === "bigint" ? value : null;

  const navUsdg = onChain ? asBig(totalAssets) : PAPER_DESK.navUsdg;
  const navPer = onChain ? asBig(navShare) : PAPER_DESK.navPerShareUsdg;
  const cashUsdg = onChain ? asBig(cash) : null;
  const shares = onChain ? asBig(totalShares) : null;
  const mine = onChain ? asBig(userShares) : null;
  const queued = onChain ? asBig(queueLen) : null;

  const leaderLabel = useMemo(() => {
    if (!onChain) return PAPER_DESK.leaderLabel;
    if (typeof leader === "string") return shortAddr(leader);
    return "…";
  }, [leader, onChain]);

  const depositDisabled = !canWrite || busy !== "idle" || !usdg || !vault;
  const redeemDisabled = !canWrite || busy !== "idle" || !vault;

  async function onDeposit() {
    if (!vault || !usdg || !address || !publicClient) return;
    setNote(null);
    let amount: bigint;
    try {
      amount = parseUnits(depositAmt.trim(), 6);
    } catch {
      setNote("Enter a valid USDG amount.");
      return;
    }
    if (amount <= 0n) {
      setNote("Amount must be greater than zero.");
      return;
    }
    try {
      setBusy("approve");
      const approveHash = await writeContractAsync({
        address: usdg,
        abi: erc20Abi,
        functionName: "approve",
        args: [vault, amount],
        chainId: CHAIN.TESTNET_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      setBusy("deposit");
      const depHash = await writeContractAsync({
        address: vault,
        abi: deskVaultAbi,
        functionName: "deposit",
        args: [amount],
        chainId: CHAIN.TESTNET_ID,
      });
      await publicClient.waitForTransactionReceipt({ hash: depHash });
      setNote("Deposit confirmed (instant mint).");
      setDepositAmt("");
      await refreshVault();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Deposit failed.");
    } finally {
      setBusy("idle");
    }
  }

  async function onRedeem() {
    if (!vault || !address || !publicClient) return;
    setNote(null);
    let sharesIn: bigint;
    try {
      sharesIn = parseUnits(redeemAmt.trim(), 6);
    } catch {
      setNote("Enter a valid share amount.");
      return;
    }
    if (sharesIn <= 0n) {
      setNote("Shares must be greater than zero.");
      return;
    }
    try {
      setBusy("redeem");
      const hash = await writeContractAsync({
        address: vault,
        abi: deskVaultAbi,
        functionName: "redeem",
        args: [sharesIn],
        chainId: CHAIN.TESTNET_ID,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const wasQueued = receipt.logs.some((log) => {
        try {
          const decoded = decodeEventLog({
            abi: deskVaultAbi,
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "WithdrawQueued";
        } catch {
          return false;
        }
      });
      setNote(
        wasQueued
          ? "Redeem queued — cash unavailable or vault paused."
          : "Redeem confirmed (instant USDG).",
      );
      setRedeemAmt("");
      await refreshVault();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Redeem failed.");
    } finally {
      setBusy("idle");
    }
  }

  const paperFills = !onChain;
  const tape = paperFills ? [] : fills;

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="brand">SEAT</div>
          <div className="tagline">Copy desks for official Stock Tokens</div>
        </div>
        <div className="header-right">
          {onChain ? (
            <Badge tone="green">Phase 1 · Testnet</Badge>
          ) : (
            <Badge tone="warn">Phase 0 · PAPER</Badge>
          )}
          <WalletBar />
        </div>
      </div>

      {walletChain === CHAIN.MAINNET_ID ? (
        <div className="banner">
          Connected to mainnet 4663. Writes are refused. Switch to testnet 46630.
        </div>
      ) : null}

      <p className="tagline">
        {onChain ? "Testnet desk" : PAPER_DESK.name} · leader{" "}
        <strong>{leaderLabel}</strong>
        {onChain && vault ? (
          <>
            {" "}
            · vault <span className="mono">{shortAddr(vault)}</span>
          </>
        ) : null}
      </p>

      <div className="grid">
        <div className="card">
          <div className="label">NAV</div>
          <div className="value">
            {navUsdg !== null ? `${formatNav(navUsdg)} USDG` : "—"}
          </div>
        </div>
        <div className="card">
          <div className="label">NAV / seat</div>
          <div className="value">
            {navPer !== null ? `${formatNav(navPer)} USDG` : "—"}
          </div>
        </div>
        {onChain ? (
          <>
            <div className="card">
              <div className="label">Cash</div>
              <div className="value">
                {cashUsdg !== null ? `${formatNav(cashUsdg)} USDG` : "—"}
              </div>
            </div>
            <div className="card">
              <div className="label">Shares</div>
              <div className="value">
                {shares !== null ? formatNav(shares) : "—"}
              </div>
            </div>
            <div className="card">
              <div className="label">Your seats</div>
              <div className="value">{mine !== null ? formatNav(mine) : "—"}</div>
            </div>
          </>
        ) : null}
        <div className="card">
          <div className="label">Mode</div>
          <div className="value">
            {onChain ? (
              <Badge tone="green">TESTNET</Badge>
            ) : (
              <Badge tone="warn">PAPER</Badge>
            )}
          </div>
        </div>
      </div>

      {onChain && queued !== null ? (
        <p className="tagline">
          Withdraw queue length: <strong>{queued.toString()}</strong>
          {queued > 0n ? " (queued — not instant)" : " (none pending)"}
        </p>
      ) : null}

      <div className="section-title">Supported assets</div>
      <div className="symbols">
        {PAPER_DESK.supportedSymbols.map((s) => (
          <Badge key={s} tone="muted">
            {s}
          </Badge>
        ))}
      </div>

      <div className="section-title">
        {paperFills ? "Fill tape (TEST DATA)" : "Fill tape"}
      </div>
      <table>
        <thead>
          <tr>
            <th>Fill</th>
            <th>Symbol</th>
            <th>Side</th>
            <th>Leader</th>
            <th>Vault</th>
            <th>Slippage</th>
            <th>Source</th>
            <th>Session</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {paperFills
            ? PAPER_DESK.fills.map((f) => (
                <tr key={f.id}>
                  <td>{f.id}</td>
                  <td>{f.symbol}</td>
                  <td>{f.side}</td>
                  <td>{formatNav(f.notionalUsdg)} USDG</td>
                  <td>—</td>
                  <td>—</td>
                  <td>
                    <Badge tone="muted">TEST DATA</Badge>
                  </td>
                  <td>
                    <Badge tone={sessionTone(f.session)}>{f.session}</Badge>
                  </td>
                  <td>{f.timestamp}</td>
                </tr>
              ))
            : tape.length === 0 ? (
                <tr>
                  <td colSpan={9} className="tagline">
                    No fills yet. Run <code>make paper</code> or{" "}
                    <code>make keeper-testnet</code> to write fixture outcomes.
                  </td>
                </tr>
              ) : (
                tape.map((f) => {
                  const intended = parseUsdgField(f.intendedUsdg);
                  const executed = parseUsdgField(f.executedUsdg);
                  const vaultLabel =
                    f.action === "skip" || f.action === "reject" || executed === 0n
                      ? `skip · ${f.reason}`
                      : `${formatNav(executed)} USDG`;
                  return (
                    <tr key={`${f.source}-${f.fillId}`}>
                      <td>{f.fillId}</td>
                      <td>{f.symbol}</td>
                      <td>{f.side}</td>
                      <td>{formatNav(intended)} USDG</td>
                      <td>{vaultLabel}</td>
                      <td>{f.slippageBps} bps</td>
                      <td>
                        <Badge tone={sourceTone(f.source)}>{f.source}</Badge>
                      </td>
                      <td>
                        <Badge tone={sessionTone(f.session)}>{f.session}</Badge>
                      </td>
                      <td>{f.timestamp}</td>
                    </tr>
                  );
                })
              )}
        </tbody>
      </table>

      <div className="section-title">Seat</div>
      <div className="actions">
        <div className="field">
          <input
            className="input"
            disabled={depositDisabled}
            inputMode="decimal"
            onChange={(e) => setDepositAmt(e.target.value)}
            placeholder="USDG amount"
            value={depositAmt}
          />
          <button
            className={depositDisabled ? "btn" : "btn btn-on"}
            disabled={depositDisabled}
            onClick={() => void onDeposit()}
            type="button"
          >
            {busy === "approve"
              ? "Approving…"
              : busy === "deposit"
                ? "Depositing…"
                : "Deposit USDG"}
          </button>
        </div>
        <div className="field">
          <input
            className="input"
            disabled={redeemDisabled}
            inputMode="decimal"
            onChange={(e) => setRedeemAmt(e.target.value)}
            placeholder="Share amount"
            value={redeemAmt}
          />
          <button
            className={redeemDisabled ? "btn" : "btn btn-on"}
            disabled={redeemDisabled}
            onClick={() => void onRedeem()}
            type="button"
          >
            {busy === "redeem" ? "Redeeming…" : "Redeem"}
          </button>
        </div>
      </div>
      {!onChain ? (
        <p className="tagline">
          Deposit / redeem stay disabled until a 46630 vault address is wired
          from a real deploy.
        </p>
      ) : !canWrite ? (
        <p className="tagline">
          Connect a wallet on Robinhood testnet 46630 to deposit or redeem.
        </p>
      ) : null}
      {note ? <p className="note">{note}</p> : null}

      <div className="disclaimer">
        {onChain ? (
          <>
            <strong>Phase 1 testnet.</strong> NAV / shares / cash above are
            read from chain 46630. Fill-tape rows labeled{" "}
            <code>fixture</code> are not live. No <code>$SEAT</code> token.
          </>
        ) : (
          <>
            <strong>Phase 0 paper fallback.</strong> All figures on this page
            are TEST DATA. 46630 addresses are unset.
          </>
        )}{" "}
        SEAT is not affiliated with Robinhood Markets. Stock Tokens are not
        shares. This is not investment advice. Do not deposit mainnet funds.
      </div>
    </main>
  );
}
