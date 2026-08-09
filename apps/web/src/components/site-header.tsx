import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header shell">
      <Link className="brand" href="/" aria-label="LaterMe home">
        <span className="brand-mark">L</span>
        <span>LaterMe</span>
      </Link>
      <nav className="site-nav" aria-label="Main navigation">
        <span className="network-chip">
          <span className="network-dot" /> Monad Testnet
        </span>
        <Link href="/pacts">My pacts</Link>
        <Link href="/negotiate">New pact</Link>
      </nav>
    </header>
  );
}
