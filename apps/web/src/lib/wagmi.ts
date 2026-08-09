import { http } from "viem";
import { createConfig } from "wagmi";
import { injected } from "wagmi/connectors";

import { monadTestnet } from "@/lib/chain";

type BrowserProvider = {
  isGateWallet?: boolean;
  isMetaMask?: boolean;
  isPhantom?: boolean;
  providers?: BrowserProvider[];
};

type WalletWindow = Window & {
  ethereum?: BrowserProvider;
  phantom?: { ethereum?: BrowserProvider };
};

function getInjectedProviders(browserWindow: unknown) {
  const ethereum = (browserWindow as WalletWindow | undefined)?.ethereum;
  return ethereum?.providers ?? (ethereum ? [ethereum] : []);
}

export const wagmiConfig = createConfig({
  chains: [monadTestnet],
  connectors: [
    injected({
      target: {
        id: "metaMaskFallback",
        name: "MetaMask",
        provider(browserWindow) {
          return getInjectedProviders(browserWindow).find(
            (provider) =>
              provider.isMetaMask &&
              !provider.isGateWallet &&
              !provider.isPhantom,
          ) as never;
        },
      },
      unstable_shimAsyncInject: 2_000,
    }),
    injected({
      target: {
        id: "phantomFallback",
        name: "Phantom",
        provider(browserWindow) {
          const walletWindow = browserWindow as WalletWindow | undefined;
          return (
            walletWindow?.phantom?.ethereum ??
            getInjectedProviders(browserWindow).find(
              (provider) => provider.isPhantom && !provider.isGateWallet,
            )
          ) as never;
        },
      },
      unstable_shimAsyncInject: 2_000,
    }),
  ],
  multiInjectedProviderDiscovery: true,
  ssr: true,
  transports: {
    [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0]),
  },
});
