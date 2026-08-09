"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { formatEther, keccak256, toHex, zeroHash } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { SiteHeader } from "@/components/site-header";
import { WalletPanel } from "@/components/wallet-panel";
import { useNowSeconds } from "@/hooks/use-now-seconds";
import { isMonadTestnetChain, monadTestnet } from "@/lib/chain";
import { mealPactAbi, mealPactAddress } from "@/lib/contracts/meal-pact";
import {
  getPactDisplayStatus,
  getPactStatusClass,
  parsePactId,
} from "@/lib/pact-records";

type PactAction = "completePact" | "cancelPact" | "expirePact";

function formatDeadline(deadline: bigint) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date(Number(deadline) * 1_000));
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("does not match the target chain")) {
      return "Your wallet is on the wrong network. Switch to Monad Testnet and try again.";
    }
    return error.message;
  }
  return "The transaction failed.";
}

export default function PactDetailPage() {
  const params = useParams<{ id: string }>();
  const pactId = useMemo(() => parsePactId(params.id), [params.id]);
  const nowSeconds = useNowSeconds();
  const { address, chainId: walletChainId, isConnected } = useAccount();
  const [pendingAction, setPendingAction] = useState<PactAction>();
  const [transactionHash, setTransactionHash] = useState<`0x${string}`>();
  const [actionError, setActionError] = useState("");
  const pactQuery = useReadContract({
    abi: mealPactAbi,
    address: mealPactAddress,
    functionName: "getPact",
    args: pactId ? [pactId] : undefined,
    chainId: monadTestnet.id,
    query: {
      enabled: Boolean(mealPactAddress && pactId),
      refetchInterval: 3_000,
    },
  });
  const { writeContractAsync, isPending: isWalletPending } = useWriteContract();
  const receiptQuery = useWaitForTransactionReceipt({
    chainId: monadTestnet.id,
    hash: transactionHash,
    query: { enabled: Boolean(transactionHash) },
  });

  async function submitAction(action: PactAction) {
    if (!mealPactAddress || !pactId || !address) return;

    setPendingAction(action);
    setActionError("");
    try {
      const args =
        action === "completePact"
          ? ([
              pactId,
              keccak256(toHex(`laterme-completion:${pactId}:${address}:${Date.now()}`)),
            ] as const)
          : ([pactId] as const);
      const hash = await writeContractAsync({
        abi: mealPactAbi,
        address: mealPactAddress,
        functionName: action,
        args,
        chainId: monadTestnet.id,
      });
      setTransactionHash(hash);
    } catch (error) {
      setPendingAction(undefined);
      setActionError(getErrorMessage(error));
    }
  }

  if (!pactId) {
    return (
      <main className="flow-page">
        <SiteHeader />
        <section className="empty-state shell">
          <p className="eyebrow">Invalid pact</p>
          <h1>This pact ID does not exist.</h1>
          <Link className="button button-dark" href="/pacts">
            Back to my pacts
          </Link>
        </section>
      </main>
    );
  }

  const pact = pactQuery.data;
  const status = pact
    ? getPactDisplayStatus(pact.status, pact.deadline, nowSeconds)
    : "Loading";
  const statusClass = pact
    ? getPactStatusClass(pact.status, pact.deadline, nowSeconds)
    : "unknown";
  const isOwner = Boolean(
    address && pact && address.toLowerCase() === pact.owner.toLowerCase(),
  );
  const isActive = pact?.status === 1;
  const isPastDeadline = Boolean(pact && nowSeconds >= pact.deadline);
  const canWrite =
    isConnected && isMonadTestnetChain(walletChainId) && !isWalletPending;
  const isConfirming = Boolean(transactionHash && receiptQuery.isPending);
  const visiblePendingAction = receiptQuery.isSuccess ? undefined : pendingAction;

  return (
    <main className="flow-page">
      <SiteHeader />
      <div className="pact-detail-layout shell">
        <section className="pact-detail-main">
          <Link className="back-link" href="/pacts">
            ← My pacts
          </Link>
          <div className="detail-title-row">
            <div>
              <p className="eyebrow">Onchain pact</p>
              <h1>Pact #{pactId.toString()}</h1>
            </div>
            <span className={`record-status status-${statusClass}`}>{status}</span>
          </div>

          {pactQuery.isPending && <div className="detail-loading">Reading Monad…</div>}

          {pactQuery.error && (
            <div className="records-empty records-error">
              <p className="eyebrow">Pact unavailable</p>
              <h2>We could not read this pact.</h2>
              <p>{pactQuery.error.message}</p>
            </div>
          )}

          {pact && (
            <article className="detail-card">
              <div className="detail-amount">
                <span>Test MON deposited</span>
                <strong>{formatEther(pact.amount)} MON</strong>
              </div>
              <dl className="detail-terms">
                <div>
                  <dt>Owner</dt>
                  <dd>{pact.owner}</dd>
                </div>
                <div>
                  <dt>Deadline</dt>
                  <dd>{formatDeadline(pact.deadline)}</dd>
                </div>
                <div>
                  <dt>Proposal hash</dt>
                  <dd>{pact.proposalHash}</dd>
                </div>
                <div>
                  <dt>Completion hash</dt>
                  <dd>{pact.completionHash === zeroHash ? "Not submitted" : pact.completionHash}</dd>
                </div>
              </dl>

              {receiptQuery.isSuccess && (
                <div className="success-callout">
                  <span>✓</span>
                  <div>
                    <strong>Transaction confirmed.</strong>
                    <p>The latest pact state has been refreshed from Monad.</p>
                  </div>
                </div>
              )}

              {(actionError || receiptQuery.error) && (
                <p className="transaction-error">
                  {actionError || getErrorMessage(receiptQuery.error)}
                </p>
              )}

              {transactionHash && (
                <a
                  className="transaction-link"
                  href={`${monadTestnet.blockExplorers.default.url}/tx/${transactionHash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  View latest transaction ↗
                </a>
              )}

              {isActive && !isPastDeadline && isOwner && (
                <div className="detail-actions">
                  <button
                    className="button button-accent"
                    disabled={!canWrite || isConfirming}
                    onClick={() => submitAction("completePact")}
                    type="button"
                  >
                    {visiblePendingAction === "completePact" ? "Completing…" : "Complete pact"}
                  </button>
                  <button
                    className="button button-ghost"
                    disabled={!canWrite || isConfirming}
                    onClick={() => submitAction("cancelPact")}
                    type="button"
                  >
                    {visiblePendingAction === "cancelPact" ? "Cancelling…" : "Cancel and refund"}
                  </button>
                </div>
              )}

              {isActive && isPastDeadline && (
                <div className="detail-actions">
                  <button
                    className="button button-dark"
                    disabled={!canWrite || isConfirming}
                    onClick={() => submitAction("expirePact")}
                    type="button"
                  >
                    {visiblePendingAction === "expirePact" ? "Expiring…" : "Expire and refund"}
                  </button>
                </div>
              )}

              {isActive && !isPastDeadline && !isOwner && (
                <p className="detail-note">Only the pact owner can complete or cancel it.</p>
              )}
            </article>
          )}
        </section>

        <aside className="pact-detail-sidebar">
          <WalletPanel compact />
          <a
            className="button button-ghost button-full"
            href={`${monadTestnet.blockExplorers.default.url}/address/${mealPactAddress}`}
            rel="noreferrer"
            target="_blank"
          >
            View contract ↗
          </a>
        </aside>
      </div>
    </main>
  );
}
