import { useEffect, useState, useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "./../../constants/constants";
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

  const { data: txHash, writeContract, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isLocalChain = chainId === docSafeLocal.id;

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
      <div className="p-6 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 max-w-xl mx-auto mt-6 transition-colors">
        Please connect your wallet to view recipient documents.
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 max-w-xl mx-auto mt-6 transition-colors">
        Please switch to DocSafe Local Hardhat (Chain 31337) to view documents.
      </div>
    );
  }

  const approveForEmpty = documents.filter((doc) => !doc.ipfsHash && !doc.isValid && !doc.isRejected);
  const needVerify = documents.filter((doc) => doc.ipfsHash && !doc.isValid && !doc.isInChangePhase && !doc.isRejected);
  const challengeForceUpdate = documents.filter((doc) => doc.isInChangePhase && !doc.isRejected);
  const validDocuments = documents.filter((doc) => doc.isValid && !doc.isInChangePhase && !doc.isRejected);
  const rejectedDocuments = documents.filter((doc) => doc.isRejected);

  return (
    <div className="p-6 space-y-8 mt-4 max-w-4xl mx-auto text-left transition-colors">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recipient Evidence Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">Recipient Address: {address}</p>
        </div>
        <button
          type="button"
          onClick={fetchDocuments}
          disabled={loading}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-xs cursor-pointer"
        >
          {loading ? "Refreshing..." : "Refresh Records"}
        </button>
      </div>

      {fetchError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-sm">
          {fetchError}
        </div>
      )}

      {(isWritePending || isTxConfirming) && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 rounded-lg border border-blue-200 dark:border-blue-800/60 text-sm">
          {isWritePending ? "Awaiting wallet confirmation..." : "Confirming transaction on local blockchain..."}
        </div>
      )}

      {writeError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-sm">
          Error: {writeError?.shortMessage || writeError?.message || "Transaction failed."}
        </div>
      )}

      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Evidence Containers: {documents.length}</p>

      {/* Stage Sections */}
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
          message: "No evidence records currently in change/dispute phase.",
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
        <div key={title} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4 transition-colors">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {title}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {docs.length}
            </span>
          </div>

          {docs.length > 0 ? (
            <div className="space-y-4">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-3 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          {doc.title || `Document #${doc.id}`}
                        </span>
                        {doc.caseNumber && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold">
                            {doc.caseNumber}
                          </span>
                        )}
                        {doc.category && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold">
                            {doc.category}
                          </span>
                        )}
                        {doc.isValid && (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold rounded text-[10px]">
                            Validated
                          </span>
                        )}
                        {doc.isInChangePhase && (
                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 font-semibold rounded text-[10px]">
                            In Change Phase
                          </span>
                        )}
                        {doc.isRejected && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-semibold rounded text-[10px]">
                            Rejected
                          </span>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-slate-500 dark:text-slate-400 italic text-[11px]">{doc.description}</p>
                      )}
                      <p className="text-slate-600 dark:text-slate-300 font-mono">
                        <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Provider:</span> {doc.provider}
                      </p>
                      {doc.ipfsHash && (
                        <p className="text-slate-600 dark:text-slate-300 font-mono break-all">
                          <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">IPFS Hash:</span> {doc.ipfsHash}
                        </p>
                      )}
                      {doc.sha256Hash && (
                        <p className="text-slate-600 dark:text-slate-300 font-mono break-all">
                          <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">SHA-256 Fingerprint:</span> {doc.sha256Hash}
                        </p>
                      )}
                      {doc.proof && (
                        <p className="text-slate-600 dark:text-slate-300 font-mono break-all">
                          <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Proof:</span> {doc.proof}
                        </p>
                      )}
                      {doc.rejectionReason && (
                        <div className="p-2.5 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800/60 text-xs mt-1">
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
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                        >
                          {previewDocId === doc.id ? "Hide Preview" : "Preview Evidence"}
                        </button>
                      )}

                      {type === "approve" && (
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleApprove(doc.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Approve Change
                        </button>
                      )}

                      {type === "validate" && (
                        <>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => handleValidate(doc.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Validate Evidence
                          </button>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => setRejectDocId(doc.id)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Reject Evidence
                          </button>
                        </>
                      )}

                      {type === "challenge" && (
                        <>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => handleValidate(doc.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Accept Force Update
                          </button>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => setChallengeDoc(doc)}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            Contest / Challenge
                          </button>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => setRejectDocId(doc.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
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
                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700/80 space-y-2">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Manage 3rd-Party Viewer Access</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={viewerInputs[doc.id] || ""}
                          onChange={(e) =>
                            setViewerInputs((prev) => ({ ...prev, [doc.id]: e.target.value }))
                          }
                          placeholder="Viewer Ethereum address (0x...)"
                          className="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleApproveViewer(doc.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded disabled:opacity-50 transition-colors cursor-pointer"
                        >
                          Approve Viewer
                        </button>
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleRevokeViewer(doc.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded disabled:opacity-50 transition-colors cursor-pointer"
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
            <p className="text-xs text-slate-400 dark:text-slate-500 italic py-2">{message}</p>
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
