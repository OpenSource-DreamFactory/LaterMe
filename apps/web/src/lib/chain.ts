import { defineChain } from "viem";

const rpcUrl =
  process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL ??
  "https://monad-testnet-rpc.huginn.tech";
const webSocketUrl =
  process.env.NEXT_PUBLIC_MONAD_TESTNET_WS_URL ??
  "wss://wss.monad-testnet-rpc.huginn.tech";

export const monadTestnet = defineChain({
  id: 10_143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
      webSocket: [webSocketUrl],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export function isMonadTestnetChain(chainId: number | undefined) {
  return chainId === monadTestnet.id;
}
