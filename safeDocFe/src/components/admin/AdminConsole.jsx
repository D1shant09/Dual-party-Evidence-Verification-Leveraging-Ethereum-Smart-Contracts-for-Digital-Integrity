import { useState, useCallback, useEffect } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { docSafeLocal } from "../../wagmi";
import { fetchEvidenceMetadata } from "../../services/api";
import RejectModal from "../reciepient/RejectModal";

export default function AdminConsole() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [isOwner, setIsOwner] = useState(false);
  const [isValidator, setIsValidator] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [validationLimit, setValidationLimitState] = useState(1);
  const [ownerAddress, setOwnerAddress] = useState("");

  // Owner controls
  const [newValidatorAddr, setNewValidatorAddr] = useState("");
  const [newLimit, setNewLimit] = useState("");
  const [ownerError, setOwnerError] = useState("");

  // Validator panel
  const [pendingDocs, setPendingDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState("");
  const [rejectDocId, setRejectDocId] = useState(null);
  const [copiedKey, setCopiedKey] = useState("");

  const isLocalChain = chainId === docSafeLocal.id;

  const { data: txHash, writeContract, isPending: isWritePending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  // Check roles against smart contract
  const checkRoles = useCallback(async () => {
    if (!address || !publicClient || !CONTRACT_ADDRESS) return;
    setRoleLoading(true);
    try {
      const [owner, isVal, limit] = await Promise.all([
        publicClient.readContract({
          abi: DocumentVerificationABI,
          address: CONTRACT_ADDRESS,
          functionName: "owner",
        }),
        publicClient.readContract({
          abi: DocumentVerificationABI,
          address: CONTRACT_ADDRESS,
          functionName: "validators",
          args: [address],
        }),
        publicClient.readContract({
          abi: DocumentVerificationABI,
          address: CONTRACT_ADDRESS,
          functionName: "validationLimit",
        }),
      ]);
      setOwnerAddress(owner);
      setIsOwner(owner.toLowerCase() === address.toLowerCase());
      setIsValidator(Boolean(isVal));
      setValidationLimitState(Number(limit));
    } catch (err) {
      console.error("Role check failed:", err);
    } finally {
      setRoleLoading(false);
    }
  }, [address, publicClient]);

  // Fetch documents for validator review
  const fetchPendingDocs = useCallback(async () => {
    if (!publicClient || !CONTRACT_ADDRESS) return;
    setDocsLoading(true);
    setDocsError("");
    try {
      const count = await publicClient.readContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "documentCount",
      });
      const total = Number(count);
      if (total === 0) {
        setPendingDocs([]);
        return;
      }

      const docs = await Promise.all(
        Array.from({ length: total }, (_, i) => i + 1).map(async (id) => {
          try {
            const [doc, voteCount, hasAlreadyVoted] = await Promise.all([
              publicClient.readContract({
                abi: DocumentVerificationABI,
                address: CONTRACT_ADDRESS,
                functionName: "getDocument",
                args: [BigInt(id)],
                account: address,
              }),
              publicClient.readContract({
                abi: DocumentVerificationABI,
                address: CONTRACT_ADDRESS,
                functionName: "validations",
                args: [BigInt(id)],
              }),
              address
                ? publicClient.readContract({
                    abi: DocumentVerificationABI,
                    address: CONTRACT_ADDRESS,
                    functionName: "hasValidated",
                    args: [BigInt(id), address],
                  })
                : false,
            ]);

            // Show documents with content that are either unvalidated or in change phase, excluding rejected
            if (!doc.ipfsHash || (doc.isValid && !doc.isInChangePhase) || doc.isRejected) return null;

            const metaRes = await fetchEvidenceMetadata(id);
            const meta = metaRes?.metadata || {};

            return {
              id: id.toString(),
              ...doc,
              title: meta.title,
              category: meta.category,
              caseNumber: meta.caseNumber,
              description: meta.description,
              voteCount: Number(voteCount),
              hasAlreadyVoted: Boolean(hasAlreadyVoted),
            };
          } catch {
            return null;
          }
        })
      );
      setPendingDocs(docs.filter(Boolean));
    } catch (err) {
      setDocsError(err.message || "Failed to load validator queue.");
    } finally {
      setDocsLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    checkRoles();
  }, [checkRoles]);

  useEffect(() => {
    if (isValidator || isOwner) {
      fetchPendingDocs();
    }
  }, [isValidator, isOwner, fetchPendingDocs]);

  useEffect(() => {
    if (isTxSuccess) {
      checkRoles();
      fetchPendingDocs();
      resetWrite();
    }
  }, [isTxSuccess, checkRoles, fetchPendingDocs, resetWrite]);

  const handleAddValidator = (e) => {
    e.preventDefault();
    setOwnerError("");
    const trimmed = newValidatorAddr.trim();
    if (!isAddress(trimmed)) {
      setOwnerError("Please enter a valid Ethereum address.");
      return;
    }
    resetWrite();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "addValidator",
      args: [trimmed],
    });
  };

  const handleSetLimit = (e) => {
    e.preventDefault();
    setOwnerError("");
    const n = parseInt(newLimit, 10);
    if (isNaN(n) || n < 1) {
      setOwnerError("Validation limit must be a positive integer (>= 1).");
      return;
    }
    resetWrite();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "setValidationLimit",
      args: [BigInt(n)],
    });
  };

  const handleValidateVote = (docId) => {
    resetWrite();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "validateFromValidators",
      args: [BigInt(docId)],
    });
  };

  if (!isConnected) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 max-w-xl mx-auto mt-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="font-semibold text-slate-800 dark:text-slate-100">Wallet Not Connected</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please connect your wallet to access the Admin &amp; Validator Console.</p>
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 max-w-xl mx-auto mt-6 transition-colors">
        <p className="font-semibold text-sm">Unsupported Network</p>
        <p className="text-xs mt-1">Please switch to DocSafe Local Hardhat (Chain 31337).</p>
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
        <svg className="animate-spin w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <span>Verifying on-chain permissions &amp; roles...</span>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 text-left transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Admin &amp; Validator Console</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">Connected: {address}</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <span className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-full text-xs font-semibold">
              Contract Owner
            </span>
          )}
          {isValidator && (
            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-semibold">
              Authorized Validator
            </span>
          )}
          {!isOwner && !isValidator && (
            <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-semibold">
              Standard User
            </span>
          )}
        </div>
      </div>

      {/* Transaction status notifications */}
      {(isWritePending || isTxConfirming) && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-xs flex items-center gap-2.5">
          <svg className="animate-spin w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>{isWritePending ? "Awaiting wallet confirmation..." : "Confirming transaction on local blockchain..."}</span>
        </div>
      )}

      {isTxSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Smart contract action confirmed successfully!</span>
        </div>
      )}

      {writeError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Error: {writeError.shortMessage || writeError.message || "Transaction failed."}</span>
        </div>
      )}

      {/* Non-admin / non-validator notice */}
      {!isOwner && !isValidator && (
        <div className="p-5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 text-xs space-y-2">
          <p className="font-semibold text-sm">Notice: View-Only Mode</p>
          <p>
            Your connected wallet is not currently configured as the contract owner or an authorized validator.
            To perform administrative actions, switch to the contract deployer account:
          </p>
          <p className="font-mono text-xs text-amber-900 dark:text-amber-300 break-all font-semibold">
            Contract Owner: {ownerAddress || "Loading..."}
          </p>
        </div>
      )}

      {/* Contract Owner Panel */}
      {isOwner && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-6 transition-colors">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Contract Owner Controls</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure validator network and multi-party quorum</p>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Quorum Threshold: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{validationLimit}</strong> vote(s)
            </span>
          </div>

          {ownerError && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-lg border border-red-200 dark:border-red-800/60">{ownerError}</p>
          )}

          {/* Add Validator form */}
          <form onSubmit={handleAddValidator} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Add Authorized Validator</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newValidatorAddr}
                onChange={(e) => setNewValidatorAddr(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isWritePending || isTxConfirming || !newValidatorAddr}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
              >
                Register Validator
              </button>
            </div>
          </form>

          {/* Set Validation Threshold form */}
          <form onSubmit={handleSetLimit} className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Set Quorum Threshold (Votes Required)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder={`Current: ${validationLimit}`}
                className="w-36 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <button
                type="submit"
                disabled={isWritePending || isTxConfirming || !newLimit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
              >
                Update Threshold
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Validator Panel / Dispute Resolution Queue (Flat by default) */}
      {(isValidator || isOwner) && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Independent Body / Forensic Validator Queue</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dual-party review &amp; dispute arbitration (Algorithm 2) &middot; Threshold: {validationLimit} approval(s)
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPendingDocs}
              disabled={docsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${docsLoading ? "animate-spin text-indigo-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{docsLoading ? "Loading..." : "Refresh Queue"}</span>
            </button>
          </div>

          {docsError && <p className="text-xs text-red-600 dark:text-red-400 p-4">{docsError}</p>}

          {pendingDocs.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic p-8 text-center">
              No evidence containers currently awaiting validator arbitration.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {pendingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="space-y-1.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {doc.title || `Document #${doc.id}`}
                      </span>
                      {doc.caseNumber && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                          {doc.caseNumber}
                        </span>
                      )}
                      {doc.category && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold">
                          {doc.category}
                        </span>
                      )}
                      {doc.isInChangePhase ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                          Contested / Change Phase
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                          Unvalidated
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">{doc.description}</p>
                    )}

                    {/* Dual-Identity details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Provider:</span>
                        <span className="truncate">{doc.provider}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(doc.provider, `p-${doc.id}`)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                          title="Copy Address"
                        >
                          {copiedKey === `p-${doc.id}` ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Recipient:</span>
                        <span className="truncate">{doc.recipient}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(doc.recipient, `r-${doc.id}`)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                          title="Copy Address"
                        >
                          {copiedKey === `r-${doc.id}` ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 truncate sm:col-span-2">
                        <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">IPFS CID:</span>
                        <span className="truncate text-indigo-600 dark:text-indigo-400">{doc.ipfsHash}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(doc.ipfsHash, `cid-${doc.id}`)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                          title="Copy CID"
                        >
                          {copiedKey === `cid-${doc.id}` ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                        </button>
                      </div>

                      {doc.sha256Hash && (
                        <div className="flex items-center gap-1.5 truncate sm:col-span-2">
                          <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">SHA-256:</span>
                          <span className="truncate text-emerald-700 dark:text-emerald-400 font-medium">{doc.sha256Hash}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(doc.sha256Hash, `sha-${doc.id}`)}
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                            title="Copy SHA-256"
                          >
                            {copiedKey === `sha-${doc.id}` ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex items-center gap-3 text-slate-500 dark:text-slate-400 font-sans">
                      <span>
                        Quorum Progress: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{doc.voteCount}</strong> / {validationLimit}
                      </span>
                      {doc.hasAlreadyVoted && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>You voted</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {isValidator && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleValidateVote(doc.id)}
                        disabled={isWritePending || isTxConfirming || doc.hasAlreadyVoted}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{doc.hasAlreadyVoted ? "Already Voted" : "Validate / Vote"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectDocId(doc.id)}
                        disabled={isWritePending || isTxConfirming}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectDocId && (
        <RejectModal
          documentId={rejectDocId}
          userRole="validator"
          onClose={() => setRejectDocId(null)}
          onSuccess={() => {
            setRejectDocId(null);
            fetchPendingDocs();
          }}
        />
      )}
    </div>
  );
}
