import { useAccount, useChainId, useDisconnect, useEnsAvatar, useEnsName, useSwitchChain } from 'wagmi';
import { docSafeLocal } from '../wagmi';
import './../App.css';

export function Account() {
  const { address, connector } = useAccount();
  const chainId = useChainId();
  const { chains, switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName });

  const formattedAddress = formatAddress(address);
  const isLocalChain = chainId === docSafeLocal.id;
  const currentChain = chains.find((c) => c.id === chainId);

  return (
    <div className="row flex flex-col gap-2">
      <div className="flex justify-between items-center w-full">
        <div className="inline flex items-center gap-2">
          {ensAvatar ? (
            <img alt="ENS Avatar" className="avatar" src={ensAvatar} />
          ) : (
            <div className="avatar" />
          )}
          <div className="stack text-left">
            {address && (
              <div className="text text-slate-900 dark:text-slate-100 font-medium">
                {ensName ? `${ensName} (${formattedAddress})` : formattedAddress}
              </div>
            )}
            <div className="subtext text-slate-500 dark:text-slate-400 text-xs">
              Connected to {connector?.name} | Network: {currentChain?.name || `Chain ID ${chainId}`}
            </div>
          </div>
        </div>
        <button
          className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors"
          onClick={() => disconnect()}
          type="button"
        >
          Disconnect
        </button>
      </div>

      {!isLocalChain && (
        <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 rounded-lg p-2.5 flex justify-between items-center text-sm transition-colors">
          <span>
            Warning: Connected to Chain {chainId}. Please switch to DocSafe Local Hardhat (Chain 31337) to interact with the local contract.
          </span>
          <button
            className="ml-3 px-3 py-1 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors"
            onClick={() => switchChain({ chainId: docSafeLocal.id })}
            type="button"
          >
            Switch to Local (31337)
          </button>
        </div>
      )}
    </div>
  );
}

function formatAddress(address) {
  if (!address) return null;
  return `${address.slice(0, 6)}…${address.slice(38, 42)}`;
}
