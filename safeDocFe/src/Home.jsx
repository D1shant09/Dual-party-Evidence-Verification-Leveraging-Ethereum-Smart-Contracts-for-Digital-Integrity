import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { ConnectWallet } from './components/ConnectWallet';
import { config } from './wagmi';
import HomeC from './components/Home/Home';

const queryClient = new QueryClient();

export default function Home() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectWallet />
        <HomeC />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
