import { useEffect, useState, useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress } from "viem";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "./../../constants/constants";
import { docSafeLocal } from "../../wagmi";
import EvidencePreview from "./EvidencePreview";
import ChallengeModal from "./ChallengeModal";

const RecipientDocuments = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Preview & challenge modal states
  const [previewDocId, setPreviewDocId] = useState(null);
  const [challengeDoc, setChallengeDoc] = useState(null);

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
            return {
              id: id.toString(),
              ipfsHash: data.ipfsHash,
              provider: data.provider,
              recipient: data.recipient,
              isValid: data.isValid,
              isInChangePhase: data.isInChangePhase,
              proof: data.proof,
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
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "validateDocument",
      args: [BigInt(documentId)],
    });
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
      <div className="p-6 text-center text-gray-600 bg-white rounded-lg shadow-sm max-w-xl mx-auto mt-6">
        Please connect your wallet to view recipient documents.
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-700 bg-amber-50 rounded-lg border border-amber-200 max-w-xl mx-auto mt-6">
        Please switch to DocSafe Local Hardhat (Chain 31337) to view documents.
      </div>
    );
  }

  const approveForEmpty = documents.filter((doc) => !doc.ipfsHash && !doc.isValid);
  const needVerify = documents.filter((doc) => doc.ipfsHash && !doc.isValid && !doc.isInChangePhase);
  const challengeForceUpdate = documents.filter((doc) => doc.isInChangePhase);
  const validDocuments = documents.filter((doc) => doc.isValid && !doc.isInChangePhase);

  return (
    <div className="p-6 space-y-8 mt-4 max-w-4xl mx-auto text-left">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recipient Evidence Dashboard</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">Recipient Address: {address}</p>
        </div>
        <button
          type="button"
          onClick={fetchDocuments}
          disabled={loading}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-semibold text-gray-700 transition-colors shadow-sm"
        >
          {loading ? "Refreshing..." : "Refresh Records"}
        </button>
      </div>

      {fetchError && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          {fetchError}
        </div>
      )}

      {(isWritePending || isTxConfirming) && (
        <div className="p-3 bg-blue-50 text-blue-700 rounded border border-blue-200 text-sm">
          {isWritePending ? "Awaiting wallet confirmation..." : "Confirming transaction on local blockchain..."}
        </div>
      )}

      {writeError && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          Error: {writeError?.shortMessage || writeError?.message || "Transaction failed."}
        </div>
      )}

      <p className="text-xs font-medium text-gray-500">Total Evidence Containers: {documents.length}</p>

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
      ].map(({ title, docs, message, type }) => (
        <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">
              {title}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              {docs.length}
            </span>
          </div>

          {docs.length > 0 ? (
            <div className="space-y-4">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">Document #{doc.id}</span>
                        {doc.isValid && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded text-[10px]">
                            Validated
                          </span>
                        )}
                        {doc.isInChangePhase && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-800 font-semibold rounded text-[10px]">
                            In Change Phase
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 font-mono">
                        <span className="font-sans font-semibold text-gray-500">Provider:</span> {doc.provider}
                      </p>
                      {doc.ipfsHash && (
                        <p className="text-gray-600 font-mono break-all">
                          <span className="font-sans font-semibold text-gray-500">IPFS Hash:</span> {doc.ipfsHash}
                        </p>
                      )}
                      {doc.proof && (
                        <p className="text-gray-600 font-mono break-all">
                          <span className="font-sans font-semibold text-gray-500">Proof:</span> {doc.proof}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {doc.ipfsHash && (
                        <button
                          type="button"
                          onClick={() => setPreviewDocId(previewDocId === doc.id ? null : doc.id)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded transition-colors"
                        >
                          {previewDocId === doc.id ? "Hide Preview" : "Preview Evidence"}
                        </button>
                      )}

                      {type === "approve" && (
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleApprove(doc.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
                        >
                          Approve Change
                        </button>
                      )}

                      {type === "validate" && (
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleValidate(doc.id)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
                        >
                          Validate Evidence
                        </button>
                      )}

                      {type === "challenge" && (
                        <>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => handleValidate(doc.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
                          >
                            Accept Force Update
                          </button>
                          <button
                            type="button"
                            disabled={isWritePending || isTxConfirming}
                            onClick={() => setChallengeDoc(doc)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded shadow-sm disabled:opacity-50"
                          >
                            Contest / Challenge
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
                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <p className="text-xs font-semibold text-gray-700">Manage 3rd-Party Viewer Access</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={viewerInputs[doc.id] || ""}
                          onChange={(e) =>
                            setViewerInputs((prev) => ({ ...prev, [doc.id]: e.target.value }))
                          }
                          placeholder="Viewer Ethereum address (0x...)"
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs font-mono text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleApproveViewer(doc.id)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                        >
                          Approve Viewer
                        </button>
                        <button
                          type="button"
                          disabled={isWritePending || isTxConfirming}
                          onClick={() => handleRevokeViewer(doc.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                        >
                          Revoke Viewer
                        </button>
                      </div>
                      {viewerError[doc.id] && (
                        <p className="text-[11px] text-red-600">{viewerError[doc.id]}</p>
                      )}
                      {viewerSuccess[doc.id] && (
                        <p className="text-[11px] text-emerald-600 font-medium">{viewerSuccess[doc.id]}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic py-2">{message}</p>
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
    </div>
  );
};

export default RecipientDocuments;
