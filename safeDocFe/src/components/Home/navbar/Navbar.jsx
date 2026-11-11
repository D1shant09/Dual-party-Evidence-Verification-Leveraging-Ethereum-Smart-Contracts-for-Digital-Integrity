import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { docSafeLocal } from "../../../wagmi";
import ThemeToggle from "../../ThemeToggle";

function Navbar() {
  const location = useLocation();
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLocalChain = chainId === docSafeLocal.id;

  const navLinks = [
    { to: "/provider", label: "Provider" },
    { to: "/reciepient", label: "Recipient" },
    { to: "/viewer", label: "Viewer" },
    { to: "/admin", label: "Admin" },
    { to: "/audit", label: "Audit & Custody", highlight: true },
  ];

  const isActive = (path) => {
    if (path === "/provider" && (location.pathname === "/" || location.pathname === "/provider")) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  const formatAddress = (addr) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="space-y-3 mb-6">
      <nav className="relative flex w-full items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs py-2.5 px-4 rounded-xl transition-colors">
        <div className="flex w-full items-center justify-between gap-4 flex-wrap">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold tracking-tight text-base sm:text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </span>
              <span>DocSafe</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60 hidden sm:inline">
                Evidence Chain
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
            {navLinks.map((link) => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 ${
                    active
                      ? link.highlight
                        ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                        : 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-semibold border border-slate-200 dark:border-slate-700'
                      : link.highlight
                      ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Action Controls: Wallet & Theme */}
          <div className="flex items-center gap-2">
            {/* Wallet State Pill */}
            {isConnected ? (
              <div className="flex items-center gap-1.5 p-1 pl-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono">
                {/* Network status dot */}
                <span
                  title={isLocalChain ? "Connected to Local Hardhat (31337)" : `Connected to Chain ${chainId}`}
                  className={`w-2 h-2 rounded-full ${isLocalChain ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}
                />
                <button
                  type="button"
                  onClick={copyAddress}
                  title="Click to copy address"
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:underline cursor-pointer"
                >
                  {copied ? "Copied!" : formatAddress(address)}
                </button>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  title="Disconnect wallet"
                  className="p-1 px-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-[11px] font-sans transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConnectModal(true)}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                </svg>
                Connect Wallet
              </button>
            )}

            {/* Theme Toggle Pill */}
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Network Warning Banner */}
      {isConnected && !isLocalChain && (
        <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 px-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs transition-colors">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <span>
              Connected to Chain ID <strong>{chainId}</strong> ({connector?.name || "Wallet"}). Please switch to <strong>DocSafe Local Hardhat (Chain 31337)</strong> to sign contract transactions.
            </span>
          </div>
          <button
            type="button"
            onClick={() => switchChain({ chainId: docSafeLocal.id })}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold shrink-0 cursor-pointer transition-colors shadow-2xs"
          >
            Switch to Hardhat (31337)
          </button>
        </div>
      )}

      {/* Connect Wallet Modal */}
      {showConnectModal && !isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 space-y-4 text-left transition-colors">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
                    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
                  </svg>
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Connect Wallet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select your Ethereum wallet provider to interact with DocSafe evidence containers:
            </p>

            <div className="space-y-2">
              {connectors.map((c) => (
                <button
                  key={c.uid}
                  type="button"
                  disabled={isConnectPending}
                  onClick={() => {
                    connect({ connector: c, chainId: docSafeLocal.id });
                    setShowConnectModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    {c.name}
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">Connect →</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-mono">
                Chain: DocSafe Local (31337)
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
