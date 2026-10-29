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
    <div className="row" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div className="inline">
          {ensAvatar ? (
            <img alt="ENS Avatar" className="avatar" src={ensAvatar} />
          ) : (
            <div className="avatar" />
          )}
          <div className="stack">
            {address && (
              <div className="text">
                {ensName ? `${ensName} (${formattedAddress})` : formattedAddress}
              </div>
            )}
            <div className="subtext">
              Connected to {connector?.name} | Network: {currentChain?.name || `Chain ID ${chainId}`}
            </div>
          </div>
        </div>
        <button className="button" onClick={() => disconnect()} type="button">
          Disconnect
        </button>
      </div>

      {!isLocalChain && (
        <div style={{
          backgroundColor: '#fff3cd',
          color: '#856404',
          border: '1px solid #ffeeba',
          borderRadius: '4px',
          padding: '8px 12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px'
        }}>
          <span>
            Warning: Connected to Chain {chainId}. Please switch to DocSafe Local Hardhat (Chain 31337) to interact with the local contract.
          </span>
          <button
            className="button"
            style={{ marginLeft: '12px', padding: '4px 8px', fontSize: '12px' }}
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
