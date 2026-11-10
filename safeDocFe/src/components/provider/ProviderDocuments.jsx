import { useState, useCallback, useEffect } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { docSafeLocal } from "../../wagmi";
import UploadEvidenceModal from "./UploadEvidenceModal";
import { uploadEvidence, fetchEvidenceMetadata, initiateEvidenceMetadata } from "../../services/api";

export default function ProviderDocuments() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [uploadModalDoc, setUploadModalDoc] = useState(null);

  // Resubmission state
  const [resubmittingDocId, setResubmittingDocId] = useState(null);
  const [resubmitSuccessMsg, setResubmitSuccessMsg] = useState("");

  const {
    data: resubmitTxHash,
    writeContract: writeResubmitContract,
    isPending: isResubmitPending,
    error: writeResubmitError,
    reset: resetResubmitWrite,
  } = useWriteContract();

  const {
    isLoading: isResubmitConfirming,
    isSuccess: isResubmitSuccess,
    data: resubmitReceipt,
  } = useWaitForTransactionReceipt({ hash: resubmitTxHash });

  // Force update modal state
  const [forceUpdateDoc, setForceUpdateDoc] = useState(null);
  const [forceFile, setForceFile] = useState(null);
  const [forceProof, setForceProof] = useState("");
  const [forceStatus, setForceStatus] = useState("idle");
  const [forceError, setForceError] = useState("");

  const {
    data: forceTxHash,
    writeContract: writeForceContract,
    isPending: isForcePending,
    error: writeForceError,
    reset: resetForceWrite,
  } = useWriteContract();
  const { isLoading: isForceConfirming, isSuccess: isForceSuccess } = useWaitForTransactionReceipt({ hash: forceTxHash });

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
        functionName: "getProviderDocs",
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
            // Read approval state for this document
            const isApproved = await publicClient.readContract({
              abi: DocumentVerificationABI,
              address: CONTRACT_ADDRESS,
              functionName: "approvals",
              args: [data.recipient, id],
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
              isApproved,
              title: meta.title,
              category: meta.category,
              caseNumber: meta.caseNumber,
              description: meta.description,
            };
          } catch (err) {
            console.error(`Failed to fetch provider doc ${id}:`, err);
            return null;
          }
        })
      );
      setDocuments(docDetails.filter(Boolean));
    } catch (error) {
      console.error("Error fetching provider documents:", error);
      setFetchError(error.message || "Could not fetch documents. Verify contract deployment on chain 31337.");
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 4000);
    return () => clearInterval(interval);
  }, [fetchDocuments]);

  // Handle force update submission (Algorithm 2)
  const handleForceUpdateSubmit = async () => {
    if (!forceUpdateDoc || !forceFile || !forceProof.trim()) {
      setForceError("Please select a revised evidence file and enter a proof description.");
      return;
    }
    setForceError("");
    setForceStatus("uploading");

    try {
      // 1. Upload to IPFS
      const uploadResult = await uploadEvidence(forceFile);
      const newHash = uploadResult.ipfsHash;

      // 2. Call forceUpdateDocument(documentId, newIpfsHash, proof)
      setForceStatus("signing");
      resetForceWrite();
      writeForceContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "forceUpdateDocument",
        args: [BigInt(forceUpdateDoc.id), newHash, forceProof.trim()],
      });
    } catch (err) {
      setForceError("Force update failed: " + (err.message || err));
      setForceStatus("error");
    }
  };

  useEffect(() => {
    if (isForceSuccess) {
      setForceStatus("done");
      fetchDocuments();
    }
  }, [isForceSuccess, fetchDocuments]);

  useEffect(() => {
    if (writeForceError && (forceStatus === "signing" || isForcePending)) {
      setForceStatus("error");
    }
  }, [writeForceError, forceStatus, isForcePending]);

  const handleResubmit = (doc) => {
    setResubmitSuccessMsg("");
    setResubmittingDocId(doc.id);
    resetResubmitWrite();
    writeResubmitContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "createResubmission",
      args: [BigInt(doc.id)],
    });
  };

  useEffect(() => {
    if (isResubmitSuccess && resubmitReceipt) {
      let newDocId = null;
      for (const log of resubmitReceipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: DocumentVerificationABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "DocumentResubmitted") {
            newDocId = decoded.args.newDocumentId.toString();
            break;
          }
        } catch {
          // ignore
        }
      }

      const prevDoc = documents.find((d) => d.id === resubmittingDocId);
      if (newDocId && prevDoc) {
        initiateEvidenceMetadata({
          documentId: newDocId,
          title: prevDoc.title ? `${prevDoc.title} (Resubmission)` : `Evidence #${newDocId}`,
          category: prevDoc.category || "Other",
          caseNumber: prevDoc.caseNumber || "",
          description: `Linked resubmission following rejection of container #${prevDoc.id}. Original rejection: "${prevDoc.rejectionReason || "Defective"}"`,
          providerAddress: address,
          recipientAddress: prevDoc.recipient,
        }).catch((e) => console.warn("Failed to seed resubmission metadata:", e));

        setResubmitSuccessMsg(`Linked container #${newDocId} created successfully! Awaiting recipient consent before upload.`);
      } else {
        setResubmitSuccessMsg("Resubmission transaction confirmed! Records refreshed.");
      }

      setResubmittingDocId(null);
      fetchDocuments();
    }
  }, [isResubmitSuccess, resubmitReceipt, resubmittingDocId, documents, address, fetchDocuments]);

  if (!isConnected) {
    return (
      <div className="p-6 text-center text-gray-600 bg-white rounded-lg shadow-sm max-w-xl mx-auto mt-6">
        Please connect your wallet to view your evidence records.
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

  // Filter documents into states
  const awaitingApproval = documents.filter((d) => !d.isApproved && !d.ipfsHash && !d.isValid && !d.isRejected);
  const readyToUpload = documents.filter((d) => d.isApproved && !d.ipfsHash && !d.isValid && !d.isRejected);
  const pendingValidation = documents.filter((d) => d.ipfsHash && !d.isValid && !d.isInChangePhase && !d.isRejected);
  const inChangePhase = documents.filter((d) => d.isInChangePhase && !d.isRejected);
  const validated = documents.filter((d) => d.isValid && !d.isInChangePhase && !d.isRejected);
  const rejected = documents.filter((d) => d.isRejected);

  const statusSections = [
    {
      title: "1. Awaiting Recipient Consent",
      docs: awaitingApproval,
      emptyMsg: "No empty containers awaiting recipient approval.",
      badge: "Pending Consent",
      badgeColor: "bg-amber-100 text-amber-800",
      action: null,
    },
    {
      title: "2. Ready for Evidence Upload",
      docs: readyToUpload,
      emptyMsg: "No containers currently approved and awaiting file upload.",
      badge: "Approved for Upload",
      badgeColor: "bg-indigo-100 text-indigo-800",
      action: "upload",
    },
    {
      title: "3. Pending Validation / Review",
      docs: pendingValidation,
      emptyMsg: "No evidence pending validation.",
      badge: "Under Review",
      badgeColor: "bg-blue-100 text-blue-800",
      action: null,
    },
    {
      title: "4. In Change Phase / Contested",
      docs: inChangePhase,
      emptyMsg: "No documents in change phase.",
      badge: "Contested / Change Phase",
      badgeColor: "bg-orange-100 text-orange-800",
      action: null,
    },
    {
      title: "5. Validated Evidence",
      docs: validated,
      emptyMsg: "No validated evidence yet.",
      badge: "Validated",
      badgeColor: "bg-emerald-100 text-emerald-800",
      action: "forceUpdate",
    },
    {
      title: "6. Rejected Submissions (Resubmission Required)",
      docs: rejected,
      emptyMsg: "No rejected evidence submissions.",
      badge: "Rejected / Defective",
      badgeColor: "bg-red-100 text-red-800",
      action: "resubmit",
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto text-left">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Provider Evidence Records</h2>
          <p className="text-xs text-gray-500 font-mono mt-1">Provider Address: {address}</p>
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
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">
          {fetchError}
        </div>
      )}

      {(isResubmitPending || isResubmitConfirming) && (
        <div className="p-3 bg-blue-50 text-blue-800 rounded-lg border border-blue-200 text-xs flex items-center gap-2">
          <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span>
            {isResubmitPending ? "Please sign linked resubmission in MetaMask..." : "Confirming linked container on-chain..."}
          </span>
        </div>
      )}

      {resubmitSuccessMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs">
          &#10003; {resubmitSuccessMsg}
        </div>
      )}

      {writeResubmitError && (
        <div className="p-3 bg-red-50 text-red-800 rounded-lg border border-red-200 text-xs">
          &#9888; Resubmission error: {writeResubmitError.shortMessage || writeResubmitError.message}
        </div>
      )}

      {documents.length === 0 && !loading && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1">
          <p className="font-semibold text-sm">No evidence containers found for address: <span className="font-mono text-xs">{address}</span></p>
          <p className="text-amber-700">
            If you created documents from a different account in MetaMask (e.g. Account 3 / 0x90F7...), please <strong>switch your active account in MetaMask</strong> to that address.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {statusSections.map(({ title, docs, emptyMsg, badge, badgeColor, action }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-800">{title}</h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${badgeColor}`}>
                {docs.length}
              </span>
            </div>

            {docs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">{emptyMsg}</p>
            ) : (
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4"
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
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${badgeColor}`}>
                          {badge}
                        </span>
                      </div>
                      {doc.description && (
                        <p className="text-gray-500 italic text-[11px]">{doc.description}</p>
                      )}
                      <p className="text-gray-600 font-mono">
                        <span className="font-sans font-semibold text-gray-500">Recipient:</span> {doc.recipient}
                      </p>
                      {doc.ipfsHash && (
                        <p className="text-gray-600 font-mono break-all">
                          <span className="font-sans font-semibold text-gray-500">IPFS CID:</span> {doc.ipfsHash}
                        </p>
                      )}
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
                      {doc.rejectionReason && (
                        <div className="p-2.5 bg-red-50 text-red-800 rounded-md border border-red-200 text-xs mt-1">
                          <span className="font-semibold block mb-0.5">Rejection Reason:</span>
                          <span className="italic">{doc.rejectionReason}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {action === "upload" && (
                        <button
                          type="button"
                          onClick={() => setUploadModalDoc(doc)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                        >
                          Upload Evidence
                        </button>
                      )}

                      {action === "forceUpdate" && (
                        <button
                          type="button"
                          onClick={() => {
                            setForceUpdateDoc(doc);
                            setForceFile(null);
                            setForceProof("");
                            setForceError("");
                            setForceStatus("idle");
                          }}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                        >
                          Force Update
                        </button>
                      )}

                      {action === "resubmit" && (
                        <button
                          type="button"
                          disabled={isResubmitPending || isResubmitConfirming}
                          onClick={() => handleResubmit(doc)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                          {isResubmitPending || isResubmitConfirming ? "Creating..." : "Create Linked Resubmission"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {uploadModalDoc && (
        <UploadEvidenceModal
          documentId={uploadModalDoc.id}
          onClose={() => setUploadModalDoc(null)}
          onSuccess={() => {
            setUploadModalDoc(null);
            fetchDocuments();
          }}
        />
      )}

      {/* Force Update modal (Algorithm 2) */}
      {forceUpdateDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-left">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Force Update Evidence</h3>
                <p className="text-xs text-gray-500">Document #{forceUpdateDoc.id} (Algorithm 2)</p>
              </div>
              <button
                type="button"
                onClick={() => setForceUpdateDoc(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-600">
              A force update replaces a previously validated document. It moves the document into the
              <strong className="text-orange-700"> Change Phase</strong>, where the recipient can either accept or challenge it with a witness statement.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Evidence File</label>
              <input
                type="file"
                onChange={(e) => setForceFile(e.target.files?.[0])}
                className="block w-full text-xs text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100"
              />
              {forceFile && (
                <p className="text-xs text-indigo-700 mt-1">{forceFile.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Proof / Justification for Change</label>
              <textarea
                value={forceProof}
                onChange={(e) => setForceProof(e.target.value)}
                placeholder="Enter justification, corrected laboratory findings, or reference CID..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {forceStatus === "uploading" && (
              <div className="p-3 bg-blue-50 text-blue-700 rounded text-xs">
                Uploading new evidence file to IPFS...
              </div>
            )}
            {(forceStatus === "signing" || isForcePending) && (
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded text-xs">
                Confirm forceUpdateDocument transaction in MetaMask...
              </div>
            )}
            {isForceConfirming && (
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded text-xs">
                Confirming force update on blockchain...
              </div>
            )}
            {forceStatus === "done" && (
              <div className="p-3 bg-green-50 text-green-700 rounded text-xs">
                &#10003; Document entered Change Phase! Recipient has been notified.
              </div>
            )}
            {forceError && (
              <div className="p-3 bg-red-50 text-red-700 rounded text-xs">
                &#9888; {forceError}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-3 border-t">
              <button
                type="button"
                onClick={() => setForceUpdateDoc(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              {forceStatus !== "done" && (
                <button
                  type="button"
                  onClick={handleForceUpdateSubmit}
                  disabled={!forceFile || !forceProof.trim() || forceStatus === "uploading" || isForcePending || isForceConfirming}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md disabled:bg-gray-300"
                >
                  Submit Force Update
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
