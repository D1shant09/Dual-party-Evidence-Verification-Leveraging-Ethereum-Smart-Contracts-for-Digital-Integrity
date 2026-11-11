import { useEffect, useState, useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { docSafeLocal } from "../../wagmi";
import EvidencePreview from "./EvidencePreview";
import ChallengeModal from "./ChallengeModal";
import RejectModal from "./RejectModal";
import { fetchEvidenceMetadata, recordReviewerDecision } from "../../services/api";

const RecipientDocuments = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Preview & modal states
  const [previewDocId, setPreviewDocId] = useState(null);
  const [challengeDoc, setChallengeDoc] = useState(null);
  const [rejectDocId, setRejectDocId] = useState(null);

  // Per-document viewer address inputs
  const [viewerInputs, setViewerInputs] = useState({});
  const [viewerError, setViewerError] = useState({});
  const [viewerSuccess, setViewerSuccess] = useState({});
  const [lastViewerAction, setLastViewerAction] = useState(null);
  const [copiedKey, setCopiedKey] = useState("");

  const { data: txHash, writeContract, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isLocalChain = chainId === docSafeLocal.id;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  const fetchDocuments = useCallback(async () => {
    if (!address || !publicClient || !CONTRACT_ADDRESS) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setFetchError("");

    try {
      const docIds = await publicClient.readContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "getRecipientDocs",
        args: [address],
      });

      if (!Array.isArray(docIds) || docIds.length === 0) {
        setDocuments([]);
        return;
      }

      const docDetails = await Promise.all(
        docIds.map(async (id) => {
          try {
            const data = await publicClient.readContract({
              abi: DocumentVerificationABI,
              address: CONTRACT_ADDRESS,
              functionName: "getDocument",
              args: [id],
              account: address,
            });

            // Fetch rich case metadata from backend if available
            const metaRes = await fetchEvidenceMetadata(id.toString());
            const meta = metaRes?.metadata || {};

            return {
              id: id.toString(),
              ipfsHash: data.ipfsHash,
              provider: data.provider,
              recipient: data.recipient,
              isValid: data.isValid,
              isInChangePhase: data.isInChangePhase,
              proof: data.proof,
              sha256Hash: data.sha256Hash,
              isRejected: data.isRejected,
              rejectionReason: data.rejectionReason,
              title: meta.title,
              category: meta.category,
              caseNumber: meta.caseNumber,
              description: meta.description,
            };
          } catch (err) {
            console.error(`Failed to fetch doc ${id}:`, err);
            return null;
          }
        })
      );

      setDocuments(docDetails.filter(Boolean));
    } catch (error) {
      console.error("Error fetching recipient documents:", error);
      setFetchError(error.message || "Could not fetch documents. Verify contract is deployed and chain is 31337.");
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 4000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  useEffect(() => {
    if (isTxSuccess) {
      if (lastViewerAction) {
        const { docId, address: targetAddr, action } = lastViewerAction;
        const shortAddr = `${targetAddr.slice(0, 6)}...${targetAddr.slice(-4)}`;
        setViewerSuccess((prev) => ({
          ...prev,
          [docId]: `Successfully ${action} viewer access for ${shortAddr}`,
        }));
        setViewerInputs((prev) => ({ ...prev, [docId]: "" }));
        setLastViewerAction(null);
      }
      fetchDocuments();
    }
  }, [isTxSuccess, lastViewerAction, fetchDocuments]);

  const handleApprove = (documentId) => {
    reset();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "approveDocumentChange",
      args: [BigInt(documentId)],
    });
  };

  const handleValidate = (documentId) => {
    reset();
    writeContract(
      {
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "validateDocument",
        args: [BigInt(documentId)],
      },
      {
        onSuccess: (hash) => {
          recordReviewerDecision(documentId, {
            reviewerAddress: address || "Recipient",
            role: "recipient",
            decision: "approved",
            reason: "Recipient confirmed evidence authenticity & integrity",
            txHash: hash,
          }).catch((e) => console.error("Failed to record decision:", e));
        },
      }
    );
  };

  const handleApproveViewer = (documentId) => {
    const inputVal = viewerInputs[documentId]?.trim();
    if (!inputVal || !isAddress(inputVal)) {
      setViewerError((prev) => ({ ...prev, [documentId]: "Please enter a valid Ethereum address." }));
      return;
    }
    setViewerError((prev) => ({ ...prev, [documentId]: "" }));
    setViewerSuccess((prev) => ({ ...prev, [documentId]: "" }));
    setLastViewerAction({ docId: documentId, address: inputVal, action: "approved" });
    reset();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "approveViewer",
      args: [BigInt(documentId), inputVal],
    });
  };

  const handleRevokeViewer = (documentId) => {
    const inputVal = viewerInputs[documentId]?.trim();
    if (!inputVal || !isAddress(inputVal)) {
      setViewerError((prev) => ({ ...prev, [documentId]: "Please enter a valid Ethereum address." }));
      return;
    }
    setViewerError((prev) => ({ ...prev, [documentId]: "" }));
    setViewerSuccess((prev) => ({ ...prev, [documentId]: "" }));
    setLastViewerAction({ docId: documentId, address: inputVal, action: "revoked" });
    reset();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "revokeViewer",
      args: [BigInt(documentId), inputVal],
    });
  };

  if (!isConnected) {
    return (
      <div className="p-8 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 max-w-xl mx-auto mt-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <p className="font-semibold text-slate-800 dark:text-slate-100">Wallet Not Connected</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please connect your Web3 wallet in the navigation bar to inspect recipient documents.</p>
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 max-w-xl mx-auto mt-6 transition-colors">
        <p className="font-semibold text-sm">Unsupported Network</p>
        <p className="text-xs mt-1">Please switch to DocSafe Local Hardhat (Chain 31337) to view documents.</p>
      </div>
    );
  }

  const approveForEmpty = documents.filter((doc) => !doc.ipfsHash && !doc.isValid && !doc.isRejected);
  const needVerify = documents.filter((doc) => doc.ipfsHash && !doc.isValid && !doc.isInChangePhase && !doc.isRejected);
  const challengeForceUpdate = documents.filter((doc) => doc.isInChangePhase && !doc.isRejected);
  const validDocuments = documents.filter((doc) => doc.isValid && !doc.isInChangePhase && !doc.isRejected);
  const rejectedDocuments = documents.filter((doc) => doc.isRejected);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto text-left transition-colors">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recipient Evidence Dashboard</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">Authorized Recipient:</span>
            <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold">{address}</span>
            <button
              type="button"
              onClick={() => copyToClipboard(address, "recipient-address")}
              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
              title="Copy Address"
            >
              {copiedKey === "recipient-address" ? (
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-sans font-medium">Copied!</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDocuments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? "Refreshing..." : "Refresh Records"}</span>
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{fetchError}</span>
        </div>
      )}

      {(isWritePending || isTxConfirming) && (
        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-xs flex items-center gap-2.5">
          <svg className="animate-spin w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>{isWritePending ? "Awaiting wallet confirmation..." : "Confirming transaction on local blockchain..."}</span>
        </div>
      )}

      {writeError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Error: {writeError?.shortMessage || writeError?.message || "Transaction failed."}</span>
        </div>
      )}

      {/* Stage Sections: Flat by Default (No Nested Cards!) */}
      {[
        {
          title: "1. Empty Containers Awaiting Recipient Approval",
          docs: approveForEmpty,
          message: "No empty containers currently awaiting consent.",
          type: "approve",
        },
        {
          title: "2. Uploaded Evidence Needing Verification",
          docs: needVerify,
          message: "No evidence currently awaiting verification.",
          type: "validate",
        },
        {
          title: "3. Contested Evidence / Change Phase",
          docs: challengeForceUpdate,
          message: "No evidence records currently in change or dispute phase.",
          type: "challenge",
        },
        {
          title: "4. Validated Evidence Records",
          docs: validDocuments,
          message: "No validated evidence records yet.",
          type: "validated",
        },
        {
          title: "5. Rejected Evidence / Defective Containers",
          docs: rejectedDocuments,
          message: "No rejected evidence submissions.",
          type: "rejected",
        },
      ].map(({ title, docs, message, type }) => (
        <div key={title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
          {/* Section Header */}
          <div className="flex justify-between items-center px-5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {docs.length}
            </span>
          </div>

          {/* List items with clean row dividers - Flat by Default Rule */}
          {docs.length > 0 ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {docs.map((doc) => (
                <div key={doc.id} className="p-5 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Identification and Metadata */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
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
                        {doc.isValid && (
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold rounded text-[10px] inline-flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Validated</span>
                          </span>
                        )}
                        {doc.isInChangePhase && (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-semibold rounded text-[10px]">
                            In Change Phase
                          </span>
                        )}
                        {doc.isRejected && (
                          <span className="px-2 py-0.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-semibold rounded text-[10px] inline-flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Rejected</span>
                          </span>
                        )}
                      </div>

                      {doc.description && (
                        <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">{doc.description}</p>
                      )}

                      {/* Dual-Identity details: labels, monospace values, and copy buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Provider:</span>
                          <span className="truncate">{doc.provider}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(doc.provider, `provider-${doc.id}`)}
                            className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                            title="Copy Provider Address"
                          >
                            {copiedKey === `provider-${doc.id}` ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px]">Copied!</span>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>

                        {doc.ipfsHash && (
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">CID:</span>
                            <span className="truncate text-indigo-600 dark:text-indigo-400">{doc.ipfsHash}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(doc.ipfsHash, `cid-${doc.id}`)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                              title="Copy IPFS CID"
                            >
                              {copiedKey === `cid-${doc.id}` ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px]">Copied!</span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}

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
                              {copiedKey === `sha-${doc.id}` ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px]">Copied!</span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}

                        {doc.proof && (
                          <div className="flex items-center gap-1.5 truncate sm:col-span-2">
                            <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Proof:</span>
                            <span className="truncate text-slate-600 dark:text-slate-300">{doc.proof}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(doc.proof, `proof-${doc.id}`)}
                              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                              title="Copy Proof"
                            >
                              {copiedKey === `proof-${doc.id}` ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-sans text-[10px]">Copied!</span>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {doc.rejectionReason && (
                        <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs mt-2">
                          <span className="font-semibold block mb-0.5">Rejection Justification:</span>
                          <span className="italic">{doc.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {doc.ipfsHash && (
                        <button
                          type="button"
                          onClick={() => setPreviewDocId(previewDocId === doc.id ? null : doc.id)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>{previewDocId === doc.id ? "Hide Preview" : "Preview Evidence"}</span>
                        </button>
                      )}

                      {type === "approve" && (
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleApprove(doc.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Approve Container</span>
                        </button>
                      )}

                      {type === "validate" && (
                        <>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => handleValidate(doc.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Validate Evidence</span>
                          </button>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => setRejectDocId(doc.id)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Reject</span>
                          </button>
                        </>
                      )}

                      {type === "challenge" && (
                        <>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => handleValidate(doc.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Accept Force Update
                          </button>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => setChallengeDoc(doc)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Contest / Challenge
                          </button>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => setRejectDocId(doc.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Evidence preview accordion */}
                  {previewDocId === doc.id && doc.ipfsHash && (
                    <div className="pt-2">
                      <EvidencePreview cid={doc.ipfsHash} onClose={() => setPreviewDocId(null)} />
                    </div>
                  )}

                  {/* Viewer Access Control for Validated Documents */}
                  {type === "validated" && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manage 3rd-Party Viewer Access</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={viewerInputs[doc.id] || ""}
                          onChange={(e) =>
                            setViewerInputs((prev) => ({ ...prev, [doc.id]: e.target.value }))
                          }
                          placeholder="Viewer Ethereum address (0x...)"
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleApproveViewer(doc.id)}
                          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Approve Viewer
                        </button>
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleRevokeViewer(doc.id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Revoke Viewer
                        </button>
                      </div>
                      {viewerError[doc.id] && (
                        <p className="text-[11px] text-red-600 dark:text-red-400">{viewerError[doc.id]}</p>
                      )}
                      {viewerSuccess[doc.id] && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{viewerSuccess[doc.id]}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
              {message}
            </div>
          )}
        </div>
      ))}

      {/* Challenge modal */}
      {challengeDoc && (
        <ChallengeModal
          documentId={challengeDoc.id}
          providerProof={challengeDoc.proof}
          onClose={() => setChallengeDoc(null)}
          onSuccess={() => {
            setChallengeDoc(null);
            fetchDocuments();
          }}
        />
      )}

      {/* Reject modal */}
      {rejectDocId && (
        <RejectModal
          documentId={rejectDocId}
          userRole="recipient"
          onClose={() => setRejectDocId(null)}
          onSuccess={() => {
            setRejectDocId(null);
            fetchDocuments();
          }}
        />
      )}
    </div>
  );
};

export default RecipientDocuments;
