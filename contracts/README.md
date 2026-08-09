# LaterMe Contracts

Foundry project for the `MealPact` contract.

## Networks

| Network | Chain ID | RPC | Explorer |
| --- | ---: | --- | --- |
| Monad Testnet | `10143` (`0x279f`) | `https://monad-testnet-rpc.huginn.tech` | [Monad Testnet Explorer](https://testnet.monadexplorer.com) |
| Monad Mainnet | `143` (`0x8f`) | `https://monad-rpc.huginn.tech` | [MonadScan](https://monadscan.com) |

The testnet WebSocket endpoint is `wss://wss.monad-testnet-rpc.huginn.tech`.

Current Monad Testnet deployment:

- `MealPact`: [`0xC187dC6b75DA1255cF9bEb52d8e9585A7e483315`](https://testnet.monadexplorer.com/address/0xC187dC6b75DA1255cF9bEb52d8e9585A7e483315)
- Demo duration: `1 second`

## Test

```bash
forge test
```

## Deploy to Monad Testnet

Create a local environment file from `.env.example`, then set a funded testnet deployer key. The provided RPC endpoints can be overridden locally when needed.

```bash
cp .env.example .env
set -a
source .env
set +a
forge script script/DeployMealPact.s.sol:DeployMealPact \
  --rpc-url monad_testnet \
  --broadcast
```

Never commit `.env` or a private key.
