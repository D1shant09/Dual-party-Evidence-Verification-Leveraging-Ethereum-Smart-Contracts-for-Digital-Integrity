import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import { base, mainnet, optimism, sepolia } from 'viem/chains';
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors';

// Local-only development chain. This RPC is served by `npm run chain`.
export const docSafeLocal = defineChain({
  id: 31337,
  name: 'DocSafe Local Hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
});

const projectId =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WALLETCONNECT_PROJECT_ID) ||
  '3fbb6bba6f1de962d911bb5b5c9dba88';

export const config = createConfig({
  // Local chain first so Wagmi's default chain is the development chain.
  chains: [docSafeLocal, mainnet, optimism, base, sepolia],
  connectors: [injected(), walletConnect({ projectId }), metaMask(), safe()],
  transports: {
    [docSafeLocal.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});
