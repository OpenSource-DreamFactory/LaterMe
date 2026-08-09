import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { WalletPanel } from "@/components/wallet-panel";

const steps = [
  {
    number: "01",
    title: "Say what you want",
    body: "Start with the real craving. No calorie logging and no judgment.",
  },
  {
    number: "02",
    title: "Meet two futures",
    body: "Choose a realistic path now or one small move toward LaterMe.",
  },
  {
    number: "03",
    title: "Make it a pact",
    body: "Lock a tiny amount of test MON, act, then get it back.",
  },
];

export default function Home() {
  return (
    <main>
      <SiteHeader />
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow hero-eyebrow">A conversation with your future self</p>
          <h1>
            One meal.
            <br />
            Two futures.
            <br />
            <em>One promise.</em>
          </h1>
          <p className="hero-lede">
            LaterMe helps you turn the next second into a choice you can
            feel good about—and verify on Monad.
          </p>
          <div className="hero-actions">
            <Link className="button button-accent button-large" href="/negotiate">
              Talk to LaterMe <span>→</span>
            </Link>
            <Link className="button button-ghost button-large" href="/negotiate?mode=observer">
              Preview without a wallet
            </Link>
          </div>
          <div className="trust-row">
            <span>No punishment</span>
            <span>No health data onchain</span>
            <span>You sign every action</span>
          </div>
        </div>

        <div className="hero-card-wrap">
          <div className="future-card">
            <div className="future-card-topline">
              <span className="live-pill">Your next second</span>
              <span className="future-date">LaterMe</span>
            </div>
            <p className="future-quote">
              “Keep the part you want most. Swap one extra, then walk with me.”
            </p>
            <div className="pact-preview">
              <div>
                <span>Micro action</span>
                <strong>One lighter swap</strong>
              </div>
              <div>
                <span>Commitment</span>
                <strong>0.001 MON</strong>
              </div>
            </div>
            <div className="future-signature">— You, one second from now</div>
          </div>
          <WalletPanel />
        </div>
      </section>

      <section className="how-it-works shell">
        <div className="section-heading">
          <p className="eyebrow">Tiny enough to start</p>
          <h2>A pact fits inside the moment.</h2>
        </div>
        <div className="step-grid">
          {steps.map((step) => (
            <article className="step-card" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer shell">
        <span>LaterMe</span>
        <p>Built for small promises on Monad Testnet.</p>
      </footer>
    </main>
  );
}
