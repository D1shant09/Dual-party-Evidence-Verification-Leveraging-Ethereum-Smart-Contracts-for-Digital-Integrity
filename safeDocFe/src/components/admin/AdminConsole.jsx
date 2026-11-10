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

  const isLocalChain = chainId === docSafeLocal.id;

  const { data: txHash, writeContract, isPending: isWritePending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

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
      <div className="p-6 text-center text-gray-600 bg-white rounded-lg shadow-sm max-w-xl mx-auto mt-6">
        Please connect your wallet to access the Admin &amp; Validator Console.
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-700 bg-amber-50 rounded-lg border border-amber-200 max-w-xl mx-auto mt-6">
        Please switch to DocSafe Local Hardhat (Chain 31337).
      </div>
    );
  }

  if (roleLoading) {
    return <div className="p-6 text-center text-gray-500">Verifying on-chain permissions...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 text-left">
      <div className="border-b pb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin &amp; Validator Console</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">Connected: {address}</p>
        </div>
        <div className="flex gap-2">
          {isOwner && (
            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
              Owner
            </span>
          )}
          {isValidator && (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
              Validator
            </span>
          )}
          {!isOwner && !isValidator && (
            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
              Standard User
            </span>
          )}
        </div>
      </div>

      {/* Transaction status notifications */}
      {(isWritePending || isTxConfirming) && (
        <div className="p-3 bg-blue-50 text-blue-700 rounded-md border border-blue-200 text-sm">
          {isWritePending ? "Awaiting wallet confirmation..." : "Confirming transaction on local blockchain..."}
        </div>
      )}
      {isTxSuccess && (
        <div className="p-3 bg-green-50 text-green-700 rounded-md border border-green-200 text-sm">
          &#10003; Smart contract action confirmed successfully!
        </div>
      )}
      {writeError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-md border border-red-200 text-sm">
          &#9888; {writeError.shortMessage || writeError.message || "Transaction failed."}
        </div>
      )}

      {/* Non-admin / non-validator notice */}
      {!isOwner && !isValidator && (
        <div className="p-5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-sm space-y-2">
          <p className="font-semibold">Notice: View-Only Mode</p>
          <p>
            Your connected wallet is not currently configured as the contract owner or an authorized validator.
            To perform administrative actions, switch to the contract deployer account:
          </p>
          <p className="font-mono text-xs text-amber-900 break-all">
            Contract Owner: {ownerAddress || "Loading..."}
          </p>
        </div>
      )}

      {/* Contract Owner Panel */}
      {isOwner && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Contract Owner Controls</h3>
              <p className="text-xs text-gray-500">Configure validator network and multi-party quorum</p>
            </div>
            <span className="text-xs font-mono text-gray-500">
              Quorum Threshold: <strong className="text-indigo-600 font-bold">{validationLimit}</strong> vote(s)
            </span>
          </div>

          {ownerError && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">{ownerError}</p>
          )}

          {/* Add Validator form */}
          <form onSubmit={handleAddValidator} className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">Add Authorized Validator</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newValidatorAddr}
                onChange={(e) => setNewValidatorAddr(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={isWritePending || isTxConfirming || !newValidatorAddr}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md disabled:bg-gray-300"
              >
                Register Validator
              </button>
            </div>
          </form>

          {/* Set Validation Threshold form */}
          <form onSubmit={handleSetLimit} className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">Set Quorum Threshold (Votes Required)</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                placeholder={`Current: ${validationLimit}`}
                className="w-36 px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={isWritePending || isTxConfirming || !newLimit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md disabled:bg-gray-300"
              >
                Update Threshold
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Validator Panel / Dispute Resolution Queue */}
      {(isValidator || isOwner) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Independent Body / Forensic Validator Queue</h3>
              <p className="text-xs text-gray-500">
                Dual-party review &amp; dispute arbitration (Algorithm 2) &middot; Threshold: {validationLimit} approval(s)
              </p>
            </div>
            <button
              type="button"
              onClick={fetchPendingDocs}
              disabled={docsLoading}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-700"
            >
              {docsLoading ? "Loading..." : "Refresh Queue"}
            </button>
          </div>

          {docsError && <p className="text-xs text-red-600">{docsError}</p>}

          {pendingDocs.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">
              No evidence containers currently awaiting validator arbitration.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">
                        {doc.title || `Document #${doc.id}`}
                      </span>
                      {doc.caseNumber && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-gray-200 text-gray-800 font-semibold">
                          {doc.caseNumber}
                        </span>
                      )}
                      {doc.category && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-semibold">
                          {doc.category}
                        </span>
                      )}
                      {doc.isInChangePhase ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800">
                          Contested / Change Phase
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                          Unvalidated
                        </span>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-gray-500 italic text-[11px]">{doc.description}</p>
                    )}
                    <p className="text-gray-600 font-mono">
                      <span className="font-sans font-semibold text-gray-500">Provider:</span> {doc.provider}
                    </p>
                    <p className="text-gray-600 font-mono">
                      <span className="font-sans font-semibold text-gray-500">Recipient:</span> {doc.recipient}
                    </p>
                    <p className="text-gray-600 font-mono break-all">
                      <span className="font-sans font-semibold text-gray-500">IPFS CID:</span> {doc.ipfsHash}
                    </p>
                    {doc.sha256Hash && (
                      <p className="text-gray-600 font-mono break-all text-[11px]">
                        <span className="font-sans font-semibold text-gray-500">SHA-256 Fingerprint:</span> {doc.sha256Hash}
                      </p>
                    )}
                    {doc.proof && (
                      <p className="text-gray-600 font-mono break-all">
                        <span className="font-sans font-semibold text-gray-500">Proof:</span> {doc.proof}
                      </p>
                    )}
                    <p className="text-gray-500">
                      Votes: <strong className="text-indigo-700">{doc.voteCount}</strong> / {validationLimit}
                      {doc.hasAlreadyVoted && (
                        <span className="ml-2 text-emerald-600 font-semibold">&#10003; You voted</span>
                      )}
                    </p>
                  </div>

                  {isValidator && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleValidateVote(doc.id)}
                        disabled={isWritePending || isTxConfirming || doc.hasAlreadyVoted}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-colors"
                      >
                        {doc.hasAlreadyVoted ? "Already Voted" : "Validate / Vote"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectDocId(doc.id)}
                        disabled={isWritePending || isTxConfirming}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md disabled:bg-gray-300 shadow-sm transition-colors"
                      >
                        Reject
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
