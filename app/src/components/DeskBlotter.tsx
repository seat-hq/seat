"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CHAIN } from "@seat/sdk";
import { decodeEventLog, formatUnits, parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { deskFactoryAbi, deskVaultAbi, erc20Abi, stakingPoolAbi } from "@/abis";
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
  const { address, isConnected } = useAccount();
  const walletChain = useChainId();
  const connectedRh =
    isConnected &&
    (walletChain === CHAIN.MAINNET_ID || walletChain === CHAIN.TESTNET_ID);
  const activeChain = connectedRh ? walletChain : CHAIN.TESTNET_ID;
  const addrs = getAddresses(activeChain);
  const factory = addrs.deskFactory;
  const [queryDesk, setQueryDesk] = useState<`0x${string}` | null>(null);
  const [factoryDesks, setFactoryDesks] = useState<`0x${string}`[]>([]);
  const publicClient = usePublicClient({ chainId: activeChain });
  const { writeContractAsync } = useWriteContract();

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("desk");
    if (q && /^0x[0-9a-fA-F]{40}$/.test(q)) {
      setQueryDesk(q.toLowerCase() as `0x${string}`);
    }
  }, []);

  useEffect(() => {
    if (!factory || !publicClient) {
      setFactoryDesks(addrs.deskVault ? [addrs.deskVault] : []);
      return;
    }
    void (async () => {
      try {
        const n = (await publicClient.readContract({
          address: factory,
          abi: deskFactoryAbi,
          functionName: "deskCount",
        })) as bigint;
        const rows: `0x${string}`[] = [];
        for (let i = 0; i < Number(n); i++) {
          const d = (await publicClient.readContract({
            address: factory,
            abi: deskFactoryAbi,
            functionName: "allDesks",
            args: [BigInt(i)],
          })) as `0x${string}`;
          rows.push(d.toLowerCase() as `0x${string}`);
        }
        setFactoryDesks(rows);
      } catch {
        setFactoryDesks(addrs.deskVault ? [addrs.deskVault] : []);
      }
    })();
  }, [factory, publicClient, addrs.deskVault]);

  const vault =
    (queryDesk &&
    factoryDesks.some((d) => d.toLowerCase() === queryDesk.toLowerCase())
      ? queryDesk
      : (factoryDesks[0] ?? addrs.deskVault)) ?? null;
  const onChain = vault !== null;

  const canWrite =
    isConnected && canWriteOnChain(activeChain, addrs) && Boolean(address);
  const isMainnetDesk = activeChain === CHAIN.MAINNET_ID && onChain;

  const readEnabled = onChain;
  const userEnabled = onChain && Boolean(address);

  const { data: leader } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "leader",
    chainId: activeChain,
    query: { enabled: readEnabled },
  });
  const { data: totalAssets, refetch: refetchAssets } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "totalAssetsUsdg",
    chainId: activeChain,
    query: { enabled: readEnabled },
  });
  const { data: totalShares, refetch: refetchShares } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "totalShares",
    chainId: activeChain,
    query: { enabled: readEnabled },
  });
  const { data: navShare, refetch: refetchNav } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "navPerShare",
    chainId: activeChain,
    query: { enabled: readEnabled },
  });
  const { data: cash, refetch: refetchCash } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "cashUsdg",
    chainId: activeChain,
    query: { enabled: readEnabled },
  });
  const { data: userShares, refetch: refetchUser } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "sharesOf",
    args: address ? [address] : undefined,
    chainId: activeChain,
    query: { enabled: userEnabled },
  });
  const { data: queueLen, refetch: refetchQueue } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "withdrawQueueLength",
    chainId: activeChain,
    query: { enabled: readEnabled },
  });
  const { data: depositCap } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "depositCapUsdg",
    chainId: activeChain,
    query: { enabled: readEnabled && activeChain === CHAIN.MAINNET_ID },
  });
  const { data: assetFromVault } = useReadContract({
    address: vault ?? undefined,
    abi: deskVaultAbi,
    functionName: "asset",
    chainId: activeChain,
    query: { enabled: readEnabled && addrs.usdg === null },
  });

  const usdg =
    addrs.usdg ??
    (typeof assetFromVault === "string" ? (assetFromVault as `0x${string}`) : null);

  const [depositAmt, setDepositAmt] = useState("");
  const [redeemAmt, setRedeemAmt] = useState("");
  const [busy, setBusy] = useState<
    "idle" | "approve" | "deposit" | "redeem" | "stake" | "list"
  >("idle");
  const [note, setNote] = useState<string | null>(null);
  const [fills, setFills] = useState<RecordedFill[]>([]);
  const [stakeAmt, setStakeAmt] = useState("");
  const [listLeader, setListLeader] = useState("");

  const { data: listingBond } = useReadContract({
    address: factory ?? undefined,
    abi: deskFactoryAbi,
    functionName: "listingBondSeat",
    chainId: activeChain,
    query: { enabled: factory !== null && addrs.seatToken !== null },
  });

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
  const stakeDisabled =
    !canWrite || busy !== "idle" || !addrs.seatToken || !addrs.stakingPool;
  const listDisabled =
    !canWrite ||
    busy !== "idle" ||
    !addrs.seatToken ||
    !factory ||
    listingBond === undefined;

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
        chainId: activeChain,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      setBusy("deposit");
      const depHash = await writeContractAsync({
        address: vault,
        abi: deskVaultAbi,
        functionName: "deposit",
        args: [amount],
        chainId: activeChain,
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
        chainId: activeChain,
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

  async function onStake() {
    if (!addrs.seatToken || !addrs.stakingPool || !publicClient) return;
    setNote(null);
    let amount: bigint;
    try {
      amount = parseUnits(stakeAmt.trim(), 18);
    } catch {
      setNote("Enter a valid $SEAT amount.");
      return;
    }
    if (amount <= 0n) {
      setNote("Amount must be greater than zero.");
      return;
    }
    try {
      setBusy("stake");
      const approveHash = await writeContractAsync({
        address: addrs.seatToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [addrs.stakingPool, amount],
        chainId: activeChain,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      const hash = await writeContractAsync({
        address: addrs.stakingPool,
        abi: stakingPoolAbi,
        functionName: "stake",
        args: [amount],
        chainId: activeChain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setNote("Stake confirmed.");
      setStakeAmt("");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Stake failed.");
    } finally {
      setBusy("idle");
    }
  }

  async function onListDesk() {
    if (!factory || !addrs.seatToken || !publicClient) return;
    setNote(null);
    const leaderAddr = listLeader.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(leaderAddr)) {
      setNote("Enter a leader address.");
      return;
    }
    const bond = typeof listingBond === "bigint" ? listingBond : 0n;
    if (bond <= 0n) {
      setNote("Listing bond is not configured.");
      return;
    }
    try {
      setBusy("list");
      const approveHash = await writeContractAsync({
        address: addrs.seatToken,
        abi: erc20Abi,
        functionName: "approve",
        args: [factory, bond],
        chainId: activeChain,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      const hash = await writeContractAsync({
        address: factory,
        abi: deskFactoryAbi,
        functionName: "listDesk",
        args: [leaderAddr as `0x${string}`],
        chainId: activeChain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setNote("Desk listed. Refresh to see it in the picker.");
      setListLeader("");
      const n = (await publicClient.readContract({
        address: factory,
        abi: deskFactoryAbi,
        functionName: "deskCount",
      })) as bigint;
      const rows: `0x${string}`[] = [];
      for (let i = 0; i < Number(n); i++) {
        const d = (await publicClient.readContract({
          address: factory,
          abi: deskFactoryAbi,
          functionName: "allDesks",
          args: [BigInt(i)],
        })) as `0x${string}`;
        rows.push(d.toLowerCase() as `0x${string}`);
      }
      setFactoryDesks(rows);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "List desk failed.");
    } finally {
      setBusy("idle");
    }
  }

  const paperFills = !onChain;
  const tape = paperFills
    ? []
    : vault
      ? fills.filter(
          (f) => !f.desk || f.desk.toLowerCase() === vault.toLowerCase(),
        )
      : fills;

  return (
    <main className="container">
      <div className="header">
        <div>
          <div className="brand">SEAT</div>
          <div className="tagline">Copy desks for official Stock Tokens</div>
        </div>
        <div className="header-right">
          {addrs.seatToken ? (
            <Badge tone="green">Phase 2 · $SEAT</Badge>
          ) : isMainnetDesk ? (
            <Badge tone="green">Phase 1 · Mainnet $50k cap</Badge>
          ) : onChain ? (
            <Badge tone="green">Phase 1 · Testnet</Badge>
          ) : (
            <Badge tone="warn">Phase 0 · PAPER</Badge>
          )}
          <WalletBar />
        </div>
      </div>

      {walletChain === CHAIN.MAINNET_ID && !onChain ? (
        <div className="banner">
          Connected to mainnet 4663. Capped desk is not wired yet. Switch to
          testnet 46630 for the cash vault, or deploy with CONFIRM_MAINNET.
        </div>
      ) : walletChain === CHAIN.MAINNET_ID && onChain ? (
        <div className="banner">
          Mainnet 4663. Deposit cap $50k USDG
          {addrs.seatToken
            ? ". $SEAT live — stake-to-list is open."
            : ". No $SEAT until Phase 2 deploy."}
        </div>
      ) : null}

      {factoryDesks.length > 1 ? (
        <p className="tagline">
          Desks:{" "}
          {factoryDesks.map((d) => (
            <button
              className={
                d.toLowerCase() === vault?.toLowerCase()
                  ? "chip chip-on"
                  : "chip"
              }
              key={d}
              onClick={() => {
                setQueryDesk(d);
                const url = new URL(window.location.href);
                url.searchParams.set("desk", d);
                window.history.replaceState({}, "", url.toString());
              }}
              type="button"
            >
              {shortAddr(d)}
            </button>
          ))}
        </p>
      ) : null}

      <p className="tagline">
        {onChain ? "Desk" : PAPER_DESK.name} · leader{" "}
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
            {typeof depositCap === "bigint" && depositCap > 0n ? (
              <div className="card">
                <div className="label">Deposit cap</div>
                <div className="value">{formatNav(depositCap)} USDG</div>
              </div>
            ) : null}
          </>
        ) : null}
        <div className="card">
          <div className="label">Mode</div>
          <div className="value">
            {onChain ? (
              <Badge tone="green">{isMainnetDesk ? "MAINNET" : "TESTNET"}</Badge>
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
      {onChain && navUsdg !== null && cashUsdg !== null && navUsdg !== cashUsdg ? (
        <p className="tagline">
          NAV and cash differ — positions are valued at the oracle. Cash is
          USDG still sitting in the vault.
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
      {addrs.seatToken && addrs.stakingPool ? (
        <>
          <div className="section-title">Stake $SEAT</div>
          <div className="actions">
            <div className="field">
              <input
                className="input"
                disabled={stakeDisabled}
                inputMode="decimal"
                onChange={(e) => setStakeAmt(e.target.value)}
                placeholder="$SEAT amount"
                value={stakeAmt}
              />
              <button
                className={stakeDisabled ? "btn" : "btn btn-on"}
                disabled={stakeDisabled}
                onClick={() => void onStake()}
                type="button"
              >
                {busy === "stake" ? "Staking…" : "Stake $SEAT"}
              </button>
            </div>
          </div>
          <p className="tagline">
            Stakers earn 10% of desk fees in USDG. Unstake on the pool contract
            if you need the tokens back.
          </p>
        </>
      ) : null}
      {addrs.seatToken && factory ? (
        <>
          <div className="section-title">List a desk</div>
          <div className="actions">
            <div className="field">
              <input
                className="input"
                disabled={listDisabled}
                onChange={(e) => setListLeader(e.target.value)}
                placeholder="Leader address"
                value={listLeader}
              />
              <button
                className={listDisabled ? "btn" : "btn btn-on"}
                disabled={listDisabled}
                onClick={() => void onListDesk()}
                type="button"
              >
                {busy === "list"
                  ? "Listing…"
                  : `Bond ${
                      typeof listingBond === "bigint"
                        ? formatUnits(listingBond, 18)
                        : "…"
                    } $SEAT`}
              </button>
            </div>
          </div>
          <p className="tagline">
            Posts the listing bond into the factory. One vault per leader. Owner
            can return the bond if the desk is sunset — no auto-slash.
          </p>
        </>
      ) : null}
      {!onChain ? (
        <p className="tagline">
          Deposit / redeem stay disabled until a vault address is wired from a
          real deploy on this chain.
        </p>
      ) : !canWrite ? (
        <p className="tagline">
          Connect a wallet on Robinhood {activeChain === CHAIN.MAINNET_ID ? "mainnet 4663" : "testnet 46630"} to deposit or redeem.
        </p>
      ) : null}
      {note ? <p className="note">{note}</p> : null}

      <div className="disclaimer">
        {onChain ? (
          <>
            <strong>
              {isMainnetDesk ? "Capped mainnet desk." : "Phase 1 testnet."}
            </strong>{" "}
            NAV / shares / cash above are read from chain {activeChain}. When
            they differ, NAV includes oracle-valued positions. Fill-tape rows
            labeled <code>fixture</code> are not live.{" "}
            {isMainnetDesk
              ? "SwapAdapter wraps cited Uniswap SwapRouter02. Deposit cap $50k USDG per desk. MAG7 only."
              : "No cited 46630 router — copies stay closed."}{" "}
            {addrs.seatToken
              ? "Fees split 70% leader / 20% protocol / 10% stakers. $SEAT is fixed-supply (1B, no mint)."
              : "No $SEAT token until Phase 2 deploy."}
          </>
        ) : (
          <>
            <strong>Phase 0 paper fallback.</strong> All figures on this page
            are TEST DATA. Vault addresses for this chain are unset.
          </>
        )}{" "}
        SEAT is not affiliated with Robinhood Markets. Stock Tokens are not
        shares. This is not investment advice
        {isMainnetDesk ? "." : ". Do not deposit mainnet funds until a capped desk is wired."}
      </div>
    </main>
  );
}
