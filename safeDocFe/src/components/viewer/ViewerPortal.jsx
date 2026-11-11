import { useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { docSafeLocal } from "../../wagmi";
import EvidencePreview from "../reciepient/EvidencePreview";
import { fetchEvidenceMetadata } from "../../services/api";

export default function ViewerPortal() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [docIdInput, setDocIdInput] = useState("");
  const [cid, setCid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [docInfo, setDocInfo] = useState(null);
  const [caseMeta, setCaseMeta] = useState(null);
  const [associatedDocs, setAssociatedDocs] = useState([]);

  const isLocalChain = chainId === docSafeLocal.id;

  // Fetch documents associated with connected wallet as provider or recipient
  useEffect(() => {
    if (!address || !publicClient || !CONTRACT_ADDRESS) {
      setAssociatedDocs([]);
      return;
    }
    (async () => {
      try {
        const [pDocs, rDocs] = await Promise.all([
          publicClient.readContract({
            abi: DocumentVerificationABI,
            address: CONTRACT_ADDRESS,
            functionName: "getProviderDocs",
            args: [address],
          }),
          publicClient.readContract({
            abi: DocumentVerificationABI,
            address: CONTRACT_ADDRESS,
            functionName: "getRecipientDocs",
            args: [address],
          }),
        ]);

        const items = [];
        if (Array.isArray(pDocs)) {
          pDocs.forEach((id) => items.push({ id: id.toString(), role: "Provider" }));
        }
        if (Array.isArray(rDocs)) {
          rDocs.forEach((id) => items.push({ id: id.toString(), role: "Recipient" }));
        }
        setAssociatedDocs(items);
      } catch (err) {
        console.error("Failed to load associated documents:", err);
      }
    })();
  }, [address, publicClient]);

  const performLookup = useCallback(async (targetId) => {
    setError("");
    setCid(null);
    setDocInfo(null);

    const id = parseInt(targetId, 10);
    if (isNaN(id) || id < 1) {
      setError("Please enter a valid positive Document ID.");
      return;
    }

    if (!address || !publicClient || !CONTRACT_ADDRESS) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      // Call viewDocument with caller account to test viewers[msg.sender][documentId]
      const ipfsHash = await publicClient.readContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "viewDocument",
        args: [BigInt(id)],
        account: address,
      });

      // Also read public metadata
      const doc = await publicClient.readContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "getDocument",
        args: [BigInt(id)],
        account: address,
      });

      // Also read rich case metadata from backend if available
      const metaRes = await fetchEvidenceMetadata(id);
      if (metaRes?.metadata) {
        setCaseMeta(metaRes.metadata);
      } else {
        setCaseMeta(null);
      }

      setCid(ipfsHash);
      setDocInfo(doc);
    } catch (err) {
      const msg = err.shortMessage || err.message || "";
      if (
        msg.toLowerCase().includes("not approved") ||
        msg.toLowerCase().includes("revert") ||
        msg.toLowerCase().includes("denied")
      ) {
        setError(
          `Access Denied: Address ${address} has not been granted viewer authorization for Document #${id}. Please request access from the recipient.`
        );
      } else {
        setError(`Failed to retrieve document: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  const handleLookup = (e) => {
    if (e) e.preventDefault();
    performLookup(docIdInput);
  };

  if (!isConnected) {
    return (
      <div className="p-6 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 max-w-xl mx-auto mt-6 transition-colors">
        Please connect your wallet to access the Authorized Viewer Portal.
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 max-w-xl mx-auto mt-6 transition-colors">
        Please switch to DocSafe Local Hardhat (Chain 31337).
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-left space-y-6 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Authorized Viewer Portal</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Inspect and verify digital evidence records you have been granted permission to access.
        </p>
      </div>

      {/* Document lookup form */}
      <form onSubmit={handleLookup} className="flex gap-3">
        <input
          type="number"
          min="1"
          value={docIdInput}
          onChange={(e) => setDocIdInput(e.target.value)}
          placeholder="Enter Document ID (e.g. 1)"
          className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={loading || !docIdInput}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
        >
          {loading ? "Verifying Authorization..." : "View Document"}
        </button>
      </form>

      {/* Quick select associated documents */}
      {associatedDocs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Quick Select:</span>
          {associatedDocs.map((item, idx) => (
            <button
              key={`${item.id}-${item.role}-${idx}`}
              type="button"
              onClick={() => {
                setDocIdInput(item.id);
                performLookup(item.id);
              }}
              className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md border border-slate-200 dark:border-slate-700 font-mono transition-colors text-xs font-semibold cursor-pointer"
            >
              Doc #{item.id} ({item.role})
            </button>
          ))}
        </div>
      )}

      {/* Access Denied / Error alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-200 space-y-1">
          <p className="font-bold text-sm">&#9888; Authorization Check</p>
          <p>{error}</p>
        </div>
      )}

      {/* Authorized document inspection */}
      {docInfo && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {caseMeta?.title || `Document #${docIdInput}`}
              </h3>
              {caseMeta?.caseNumber && (
                <span className="px-2.5 py-0.5 rounded text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700">
                  {caseMeta.caseNumber}
                </span>
              )}
              {caseMeta?.category && (
                <span className="px-2.5 py-0.5 rounded text-xs bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold">
                  {caseMeta.category}
                </span>
              )}
              {docInfo.isRejected ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60">
                  &#10007; Rejected Submission
                </span>
              ) : docInfo.isValid ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  &#10003; Validated Evidence
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                  Pending Full Validation
                </span>
              )}
            </div>
            {caseMeta?.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">{caseMeta.description}</p>
            )}
            {docInfo.rejectionReason && (
              <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800/60 text-xs">
                <span className="font-semibold block mb-0.5">Rejection Justification:</span>
                <span className="italic">{docInfo.rejectionReason}</span>
              </div>
            )}
            <div className="mt-2 text-xs font-mono text-slate-600 dark:text-slate-300 space-y-1">
              <p>
                <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Provider:</span> {docInfo.provider}
              </p>
              <p>
                <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Recipient:</span> {docInfo.recipient}
              </p>
              {docInfo.sha256Hash && (
                <p className="break-all text-[11px]">
                  <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">SHA-256 Fingerprint:</span>{" "}
                  {docInfo.sha256Hash}
                </p>
              )}
              <p className="break-all">
                <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">IPFS CID:</span>{" "}
                {cid ? cid : <span className="text-amber-700 dark:text-amber-400 font-sans italic">Not yet uploaded</span>}
              </p>
            </div>
          </div>

          {cid ? (
            <EvidencePreview cid={cid} />
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-200">
              Authorization confirmed. You are approved to view this container, but the provider has not yet uploaded the evidence file.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
