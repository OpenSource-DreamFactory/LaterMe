"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { useAccount } from "wagmi";

import { SiteHeader } from "@/components/site-header";
import { WalletPanel } from "@/components/wallet-panel";
import { useMealPacts } from "@/hooks/use-meal-pacts";
import { useNowSeconds } from "@/hooks/use-now-seconds";
import {
  getPactDisplayStatus,
  getPactStatusClass,
} from "@/lib/pact-records";

function formatDeadline(deadline: bigint) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(Number(deadline) * 1_000));
}

export default function PactsPage() {
  const { address, isConnected } = useAccount();
  const nowSeconds = useNowSeconds();
  const pactsQuery = useMealPacts(address);

  return (
    <main className="flow-page">
      <SiteHeader />
      <section className="records-page shell">
        <div className="records-heading">
          <div>
            <p className="eyebrow">Onchain commitments</p>
            <h1>My pacts.</h1>
            <p>Every promise created by your connected wallet, straight from Monad.</p>
          </div>
          <Link className="button button-accent" href="/negotiate">
            Create another pact
          </Link>
        </div>

        <WalletPanel compact />

        {!isConnected && (
          <div className="records-empty">
            <p className="eyebrow">Wallet required</p>
            <h2>Connect to see your history.</h2>
            <p>LaterMe filters the public contract events by your wallet address.</p>
          </div>
        )}

        {isConnected && pactsQuery.isPending && (
          <div className="records-empty">
            <p className="eyebrow">Reading Monad</p>
            <h2>Finding your pacts…</h2>
          </div>
        )}

        {isConnected && pactsQuery.error && (
          <div className="records-empty records-error">
            <p className="eyebrow">RPC unavailable</p>
            <h2>We could not load your pacts.</h2>
            <p>{pactsQuery.error.message}</p>
            <button
              className="button button-ghost"
              onClick={() => pactsQuery.refetch()}
              type="button"
            >
              Try again
            </button>
          </div>
        )}

        {isConnected && pactsQuery.data?.length === 0 && (
          <div className="records-empty">
            <p className="eyebrow">Nothing here yet</p>
            <h2>Your first pact takes 1 second.</h2>
            <Link className="button button-dark" href="/negotiate">
              Make a demo pact
            </Link>
          </div>
        )}

        {pactsQuery.data && pactsQuery.data.length > 0 && (
          <div className="records-grid">
            {pactsQuery.data.map((pact) => {
              const status = getPactDisplayStatus(
                pact.status,
                pact.deadline,
                nowSeconds,
              );
              const statusClass = getPactStatusClass(
                pact.status,
                pact.deadline,
                nowSeconds,
              );

              return (
                <Link className="record-card" href={`/pacts/${pact.id}`} key={pact.id}>
                  <div className="record-card-topline">
                    <span>Pact #{pact.id.toString()}</span>
                    <span className={`record-status status-${statusClass}`}>
                      {status}
                    </span>
                  </div>
                  <strong>{formatEther(pact.amount)} MON held</strong>
                  <dl>
                    <div>
                      <dt>Deadline</dt>
                      <dd>{formatDeadline(pact.deadline)}</dd>
                    </div>
                    <div>
                      <dt>Proposal</dt>
                      <dd>{pact.proposalHash.slice(0, 12)}…</dd>
                    </div>
                  </dl>
                  <span className="record-link">Open pact →</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
