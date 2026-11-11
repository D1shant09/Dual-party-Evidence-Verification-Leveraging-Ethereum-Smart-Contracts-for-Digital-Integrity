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
  const [copiedKey, setCopiedKey] = useState("");

  const isLocalChain = chainId === docSafeLocal.id;

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

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
      <div className="p-8 text-center text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 max-w-xl mx-auto mt-6 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 mx-auto text-slate-400 dark:text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <p className="font-semibold text-slate-800 dark:text-slate-100">Wallet Not Connected</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Please connect your wallet to access the Authorized Viewer Portal.</p>
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

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto text-left space-y-6 transition-colors">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Authorized Viewer Portal</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Inspect and verify digital evidence records you have been granted permission to access via on-chain access control.
        </p>
      </div>

      {/* Document lookup form */}
      <form onSubmit={handleLookup} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min="1"
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            placeholder="Enter Document ID (e.g. 1)"
            className="w-full pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
          />
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          disabled={loading || !docIdInput}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Verifying Authorization...</span>
            </>
          ) : (
            "View Document"
          )}
        </button>
      </form>

      {/* Quick select associated documents */}
      {associatedDocs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Select:</span>
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
          <div className="flex items-center gap-2 font-bold text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Authorization Check Failed</span>
          </div>
          <p className="pl-6">{error}</p>
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
                <span className="px-2.5 py-0.5 rounded text-xs bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 font-semibold">
                  {caseMeta.category}
                </span>
              )}
              {docInfo.isRejected ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 inline-flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Rejected Submission</span>
                </span>
              ) : docInfo.isValid ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 inline-flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Validated Evidence</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                  Pending Full Validation
                </span>
              )}
            </div>
            {caseMeta?.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 italic">{caseMeta.description}</p>
            )}
            {docInfo.rejectionReason && (
              <div className="mt-2 p-2.5 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs">
                <span className="font-semibold block mb-0.5">Rejection Justification:</span>
                <span className="italic">{docInfo.rejectionReason}</span>
              </div>
            )}
            {/* Dual-Identity details */}
            <div className="mt-3 text-xs font-mono text-slate-600 dark:text-slate-300 space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate">
                  <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Provider:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{docInfo.provider}</span>
                </p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(docInfo.provider, "provider")}
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                >
                  {copiedKey === "provider" ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="truncate">
                  <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Recipient:</span>{" "}
                  <span className="text-slate-800 dark:text-slate-200 font-bold">{docInfo.recipient}</span>
                </p>
                <button
                  type="button"
                  onClick={() => copyToClipboard(docInfo.recipient, "recipient")}
                  className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                >
                  {copiedKey === "recipient" ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                </button>
              </div>

              {docInfo.sha256Hash && (
                <div className="flex items-center justify-between gap-2">
                  <p className="break-all text-[11px]">
                    <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">SHA-256 Fingerprint:</span>{" "}
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{docInfo.sha256Hash}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(docInfo.sha256Hash, "sha256")}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                  >
                    {copiedKey === "sha256" ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <p className="break-all">
                  <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">IPFS CID:</span>{" "}
                  {cid ? <span className="text-indigo-600 dark:text-indigo-400 font-bold">{cid}</span> : <span className="text-amber-700 dark:text-amber-400 font-sans italic">Not yet uploaded</span>}
                </p>
                {cid && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(cid, "cid")}
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer shrink-0"
                  >
                    {copiedKey === "cid" ? <span className="text-emerald-600 text-[10px] font-sans">Copied!</span> : <span className="text-[10px] font-sans">Copy</span>}
                  </button>
                )}
              </div>
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
