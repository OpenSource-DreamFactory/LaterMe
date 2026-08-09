"use client";

import { formatEther } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import { isMonadTestnetChain, monadTestnet } from "@/lib/chain";
import {
  getSupportedWalletConnectors,
  getWalletConnectionError,
} from "@/lib/wallet-connectors";

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletPanel({ compact = false }: { compact?: boolean }) {
  const { address, chainId: walletChainId, isConnected } = useAccount();
  const {
    connectors,
    connect,
    error: connectError,
    isPending,
    variables,
  } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({
    address,
    chainId: monadTestnet.id,
    query: { enabled: Boolean(address && isMonadTestnetChain(walletChainId)) },
  });

  const isCorrectNetwork = isMonadTestnetChain(walletChainId);
  const supportedWallets = getSupportedWalletConnectors(connectors);

  if (!isConnected || !address) {
    return (
      <div className={compact ? "wallet-panel compact" : "wallet-panel"}>
        <div>
          <p className="eyebrow">Wallet</p>
          <h3>Keep the final say</h3>
          {!compact && (
            <p className="muted">
              LaterMe prepares the transaction. Your wallet always approves it.
            </p>
          )}
        </div>
        {supportedWallets.length > 0 ? (
          <div className="wallet-connectors">
            {supportedWallets.map((connector) => {
              const isOpening = isPending && variables?.connector === connector;

              return (
                <button
                  className="button button-dark"
                  disabled={isPending}
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  type="button"
                >
                  {isOpening ? "Opening wallet…" : `Connect ${connector.name}`}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="wallet-help">
            No supported wallet is available in this browser. Open this page in
            Chrome with MetaMask or Phantom installed and unlocked.
          </p>
        )}
        {connectError && (
          <p className="form-error">{getWalletConnectionError(connectError)}</p>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? "wallet-panel compact" : "wallet-panel connected"}>
      <div className="wallet-identity">
        <span className="wallet-avatar">{address.slice(2, 4).toUpperCase()}</span>
        <div>
          <p className="eyebrow">Connected</p>
          <strong>{shortenAddress(address)}</strong>
          {balance && isCorrectNetwork && (
            <span className="wallet-balance">
              {Number(formatEther(balance.value)).toFixed(3)} MON
            </span>
          )}
        </div>
      </div>
      <div className="wallet-actions">
        {!isCorrectNetwork && (
          <button
            className="button button-accent"
            disabled={isSwitching}
            onClick={() => switchChain({ chainId: monadTestnet.id })}
            type="button"
          >
            {isSwitching ? "Switching…" : "Switch to Monad"}
          </button>
        )}
        <a
          className="text-link"
          href="https://faucet.monad.xyz/"
          rel="noreferrer"
          target="_blank"
        >
          Get test MON ↗
        </a>
        <button className="text-button" onClick={() => disconnect()} type="button">
          Disconnect
        </button>
      </div>
    </div>
  );
}
