type AnnouncedWalletConnector = {
  id: string;
  name: string;
  rdns?: string | readonly string[];
  uid: string;
};

const supportedWalletRdns = new Set(["app.phantom", "io.metamask"]);
const fallbackWalletRdns: Record<string, string> = {
  metaMaskFallback: "io.metamask",
  phantomFallback: "app.phantom",
};

export function getSupportedWalletConnectors<
  Connector extends AnnouncedWalletConnector,
>(connectors: readonly Connector[]) {
  const seenWallets = new Set<string>();

  return [...connectors]
    .sort((first, second) => Number(!first.rdns) - Number(!second.rdns))
    .filter((connector) => {
      const rdns = Array.isArray(connector.rdns)
        ? connector.rdns[0]
        : connector.rdns;

      const walletRdns =
        rdns ?? fallbackWalletRdns[connector.id] ?? connector.id;

      if (!supportedWalletRdns.has(walletRdns) || seenWallets.has(walletRdns)) {
        return false;
      }

      seenWallets.add(walletRdns);
      return true;
    });
}

export function getWalletConnectionError(error: unknown) {
  if (
    error instanceof Error &&
    (error.message.includes("Provider not found") ||
      error.message.includes("Connector not connected"))
  ) {
    return "This browser cannot access MetaMask or Phantom. Open this page in the Chrome profile where your wallet extension is installed and unlocked.";
  }

  return error instanceof Error ? error.message : "Could not connect the wallet.";
}
