"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import { keccak256, parseEther, parseEventLogs, toHex } from "viem";
import {
  useAccount,
  useConnect,
  useSendTransaction,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { SiteHeader } from "@/components/site-header";
import { WalletPanel } from "@/components/wallet-panel";
import { isMonadTestnetChain, monadTestnet } from "@/lib/chain";
import {
  mealPactAbi,
  mealPactAddress,
} from "@/lib/contracts/meal-pact";
import {
  DEMO_PACT_AMOUNT,
  buildCreatePactPlan,
  executeWithMossFallback,
  type ExecutionPath,
} from "@/lib/moss";
import { parsePactDraft, PACT_DRAFT_STORAGE_KEY } from "@/lib/pact";
import { initialPactState, pactReducer, type PactPhase } from "@/lib/pact-machine";
import {
  getSupportedWalletConnectors,
  getWalletConnectionError,
} from "@/lib/wallet-connectors";

const depositAmount = DEMO_PACT_AMOUNT;

const phaseLabels: Record<PactPhase, string> = {
  DRAFT: "Loading draft",
  READY: "Ready to sign",
  AWAITING_SIGNATURE: "Check your wallet",
  TX_PENDING: "Confirming on Monad",
  ACTIVE: "Pact is active",
  FAILED: "Needs attention",
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes("does not match the target chain")) {
      return "Your wallet is on the wrong network. Switch to Monad Testnet and try again.";
    }
    return error.message;
  }
  return "The transaction could not be prepared.";
}

function subscribeToDraft(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getDraftSnapshot() {
  return localStorage.getItem(PACT_DRAFT_STORAGE_KEY);
}

function getServerDraftSnapshot() {
  return null;
}

export default function NewPactPage() {
  const savedDraft = useSyncExternalStore(
    subscribeToDraft,
    getDraftSnapshot,
    getServerDraftSnapshot,
  );
  const draft = useMemo(() => {
    if (!savedDraft) return null;
    return parsePactDraft(savedDraft);
  }, [savedDraft]);
  const [state, dispatch] = useReducer(pactReducer, {
    ...initialPactState,
    phase: "READY",
  });
  const [walletActionError, setWalletActionError] = useState("");
  const [executionPath, setExecutionPath] = useState<ExecutionPath | null>(null);
  const [executionSummary, setExecutionSummary] = useState("");
  const { address, chainId: walletChainId, isConnected } = useAccount();
  const {
    connectors,
    connectAsync,
    error: connectError,
    isPending: isConnecting,
  } = useConnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { sendTransactionAsync, isPending: isSendPending } = useSendTransaction();
  const isWalletPending = isWritePending || isSendPending;
  const receiptQuery = useWaitForTransactionReceipt({
    chainId: monadTestnet.id,
    hash: state.transactionHash,
    query: { enabled: Boolean(state.transactionHash) },
  });

  useEffect(() => {
    if (!receiptQuery.data || state.phase !== "TX_PENDING") return;

    const events = parseEventLogs({
      abi: mealPactAbi,
      eventName: "PactCreated",
      logs: receiptQuery.data.logs,
      strict: true,
    });
    dispatch({
      type: "TRANSACTION_CONFIRMED",
      pactId: events[0]?.args.pactId,
    });
  }, [receiptQuery.data, state.phase]);

  useEffect(() => {
    if (receiptQuery.error && state.phase === "TX_PENDING") {
      dispatch({ type: "FAILED", error: getErrorMessage(receiptQuery.error) });
    }
  }, [receiptQuery.error, state.phase]);

  const proposalHash = useMemo(
    () => (draft ? keccak256(toHex(JSON.stringify(draft))) : undefined),
    [draft],
  );
  const supportedWallets = getSupportedWalletConnectors(connectors);

  const canCreate = Boolean(
    draft &&
      proposalHash &&
      mealPactAddress &&
      isConnected &&
      address &&
      isMonadTestnetChain(walletChainId) &&
      state.phase !== "AWAITING_SIGNATURE" &&
      state.phase !== "TX_PENDING" &&
      state.phase !== "ACTIVE",
  );

  async function createPact() {
    if (!draft || !proposalHash || !mealPactAddress || !address) return;
    const contractAddress = mealPactAddress;

    dispatch({ type: "REQUEST_SIGNATURE" });
    setExecutionPath(null);
    setExecutionSummary("");
    try {
      const result = await executeWithMossFallback({
        chainId: monadTestnet.id,
        buildPlan: () =>
          buildCreatePactPlan({
            account: address,
            proposalHash,
            durationSeconds: draft.choice.durationSeconds,
            amount: depositAmount,
          }),
        sendMossTx: (tx) =>
          sendTransactionAsync({
            to: tx.to,
            data: tx.data,
            value: tx.value,
            chainId: tx.chainId,
          }),
        sendViemFallback: () =>
          writeContractAsync({
            abi: mealPactAbi,
            address: contractAddress,
            functionName: "createPact",
            args: [proposalHash, BigInt(draft.choice.durationSeconds)],
            chainId: monadTestnet.id,
            value: parseEther(depositAmount),
          }),
      });
      setExecutionPath(result.path);
      setExecutionSummary(
        result.simulationSkippedReason
          ? `${result.summary ?? ""} (${result.simulationSkippedReason})`
          : result.summary ?? "",
      );
      dispatch({ type: "TRANSACTION_SENT", transactionHash: result.hash });
    } catch (error) {
      dispatch({ type: "FAILED", error: getErrorMessage(error) });
    }
  }

  async function connectWallet(connector: (typeof supportedWallets)[number]) {
    setWalletActionError("");
    try {
      await connectAsync({ connector });
    } catch (error) {
      setWalletActionError(getErrorMessage(error));
    }
  }

  async function switchToMonad() {
    setWalletActionError("");
    try {
      await switchChainAsync({ chainId: monadTestnet.id });
      dispatch({ type: "READY" });
    } catch (error) {
      setWalletActionError(getErrorMessage(error));
    }
  }

  if (!draft) {
    return (
      <main className="flow-page">
        <SiteHeader />
        <section className="empty-state shell">
          <p className="eyebrow">No draft found</p>
          <h1>Start with an honest food choice.</h1>
          <Link className="button button-accent" href="/negotiate">
            Talk to LaterMe
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flow-page">
      <SiteHeader />
      <div className="pact-layout shell">
        <section className="pact-main">
          <Link className="back-link" href="/negotiate">
            ← Change my choice
          </Link>
          <p className="eyebrow">Step 2 of 2 · Review</p>
          <h1>Make this moment count.</h1>
          <p className="flow-subtitle">
            Read the terms in plain language. Your wallet will show the exact
            onchain transaction before anything happens.
          </p>

          <article className="pact-card">
            <div className="pact-card-header">
              <div>
                <span className="pact-type">
                  {draft.choice.id === "future" ? "Later Me" : "Current Me"}
                </span>
                <h2>{draft.choice.label}</h2>
              </div>
              <div className="pact-badges">
                {executionPath && (
                  <span className="safe-fallback-pill">
                    {executionPath === "moss" ? "Moss plan" : "Direct wallet path"}
                  </span>
                )}
                <span className={`phase-badge phase-${state.phase.toLowerCase()}`}>
                  {phaseLabels[state.phase]}
                </span>
              </div>
            </div>

            {executionSummary && (
              <p className="moss-summary">{executionSummary}</p>
            )}

            <div className="pact-action-block">
              <span>I promise to</span>
              <strong>{draft.choice.actionText}</strong>
            </div>

            <dl className="pact-terms">
              <div>
                <dt>Duration</dt>
                <dd>{draft.choice.durationSeconds} second</dd>
              </div>
              <div>
                <dt>Test MON held</dt>
                <dd>{depositAmount} MON</dd>
              </div>
              <div>
                <dt>Refund</dt>
                <dd>Complete, cancel, or expire</dd>
              </div>
              <div>
                <dt>Network</dt>
                <dd>Monad Testnet</dd>
              </div>
            </dl>

            {state.phase === "ACTIVE" && (
              <div className="success-callout">
                <span>✓</span>
                <div>
                  <strong>Pact #{state.pactId?.toString() ?? "created"} is active.</strong>
                  <p>Your promise now has an onchain timestamp.</p>
                  {state.pactId && (
                    <Link className="transaction-link" href={`/pacts/${state.pactId}`}>
                      Open pact →
                    </Link>
                  )}
                </div>
              </div>
            )}

            {state.error && <p className="transaction-error">{state.error}</p>}

            {!isConnected && (
              <div className="pact-prerequisite">
                <div>
                  <strong>Connect a wallet to continue</strong>
                  <p>Wallet status refreshes automatically—no page reload needed.</p>
                </div>
                <div className="pact-inline-connectors">
                  {supportedWallets.length > 0 ? (
                    supportedWallets.map((connector) => (
                      <button
                        className="button button-dark"
                        disabled={isConnecting}
                        key={connector.uid}
                        onClick={() => connectWallet(connector)}
                        type="button"
                      >
                        {isConnecting ? "Connecting…" : `Connect ${connector.name}`}
                      </button>
                    ))
                  ) : (
                    <span>Looking for Phantom or MetaMask…</span>
                  )}
                </div>
              </div>
            )}

            {isConnected && !isMonadTestnetChain(walletChainId) && (
              <button
                className="button button-dark button-full button-large"
                disabled={isSwitching}
                onClick={switchToMonad}
                type="button"
              >
                {isSwitching ? "Switching network…" : "Switch to Monad Testnet"}
              </button>
            )}

            {(walletActionError || connectError) && (
              <p className="transaction-error">
                {walletActionError || getWalletConnectionError(connectError)}
              </p>
            )}

            {state.transactionHash && (
              <a
                className="transaction-link"
                href={`${monadTestnet.blockExplorers.default.url}/tx/${state.transactionHash}`}
                rel="noreferrer"
                target="_blank"
              >
                View transaction {state.transactionHash.slice(0, 10)}… ↗
              </a>
            )}

            {!mealPactAddress && (
              <div className="config-callout">
                <strong>Contract deployment pending</strong>
                <p>
                  The full signing flow is wired. Set
                  <code>NEXT_PUBLIC_MEAL_PACT_ADDRESS</code> after testnet deployment
                  to enable this button.
                </p>
              </div>
            )}

            {isConnected && isMonadTestnetChain(walletChainId) && (
              <button
                className="button button-accent button-full button-large"
                disabled={!canCreate || isWalletPending}
                onClick={createPact}
                type="button"
              >
                {state.phase === "AWAITING_SIGNATURE"
                  ? "Confirm in your wallet…"
                  : state.phase === "TX_PENDING"
                    ? "Confirming on Monad…"
                    : state.phase === "ACTIVE"
                      ? "Pact created"
                      : `Create pact · ${depositAmount} MON`}
              </button>
            )}
          </article>
        </section>

        <aside className="pact-sidebar">
          <WalletPanel compact />
          <div className="safety-card">
            <p className="eyebrow">What goes onchain</p>
            <ul>
              <li>A hash of this proposal</li>
              <li>Your wallet and deadline</li>
              <li>The test MON deposit</li>
            </ul>
            <p>Your meal text and health details stay offchain.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
