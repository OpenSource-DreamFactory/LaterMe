"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAccount, useConnectors, WagmiProvider } from "wagmi";
import { reconnect } from "wagmi/actions";

import { wagmiConfig } from "@/lib/wagmi";
import { getSupportedWalletConnectors } from "@/lib/wallet-connectors";

function WalletSessionSync() {
  const { isConnected } = useAccount();
  const connectors = useConnectors();
  const supportedWallets = useMemo(
    () => getSupportedWalletConnectors(connectors),
    [connectors],
  );

  useEffect(() => {
    if (isConnected) return;

    const syncWallets = () => {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
      if (supportedWallets.length > 0) {
        void reconnect(wagmiConfig, { connectors: supportedWallets }).catch(
          () => undefined,
        );
      }
    };

    syncWallets();
    const interval = window.setInterval(syncWallets, 3_000);
    return () => window.clearInterval(interval);
  }, [isConnected, supportedWallets]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <WalletSessionSync />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
