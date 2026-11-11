import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { fetchCompleteAuditTrail } from "../../services/auditService";
import ChainOfCustodyTimeline from "./ChainOfCustodyTimeline";
import CustodyCertificateModal from "./CustodyCertificateModal";

export default function AuditPortal() {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [selectedDocId, setSelectedDocId] = useState("1");
  const [docIdInput, setDocIdInput] = useState("1");
  const [availableDocs, setAvailableDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [auditData, setAuditData] = useState({ metadata: null, decisions: [], timeline: [] });
  const [docInfo, setDocInfo] = useState(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  // Load list of all available document IDs
  useEffect(() => {
    (async () => {
      try {
        let maxCount = 0;
        if (publicClient && CONTRACT_ADDRESS) {
          const count = await publicClient.readContract({
            abi: DocumentVerificationABI,
            address: CONTRACT_ADDRESS,
            functionName: "documentCount",
          });
          maxCount = Number(count);
        }

        const ids = Array.from({ length: maxCount }, (_, i) => String(i + 1));
        setAvailableDocs(ids);
      } catch (err) {
        console.warn("Could not fetch document count for audit portal:", err);
      }
    })();
  }, [publicClient]);

  // Load audit trail for selected document
  const loadAuditData = useCallback(async (docId) => {
    if (!docId) return;
    setLoading(true);
    setError("");

    try {
      let onChainDoc = null;
      if (publicClient && CONTRACT_ADDRESS) {
        try {
          onChainDoc = await publicClient.readContract({
            abi: DocumentVerificationABI,
            address: CONTRACT_ADDRESS,
            functionName: "getDocument",
            args: [BigInt(docId)],
            account: address,
          });
        } catch {
          // Gated or non-existent
        }
      }
      setDocInfo(onChainDoc);

      const data = await fetchCompleteAuditTrail(publicClient, CONTRACT_ADDRESS, docId);
      setAuditData(data);
    } catch (err) {
      console.error("Failed to load audit trail:", err);
      setError(err.message || "Could not retrieve audit trail.");
    } finally {
      setLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    loadAuditData(selectedDocId);
  }, [selectedDocId, loadAuditData]);

  const handleLookup = (e) => {
    e.preventDefault();
    const trimmed = docIdInput.trim();
    if (trimmed) {
      setSelectedDocId(trimmed);
    }
  };

  const metadata = auditData.metadata;
  const caseNumber = metadata?.caseNumber || `CASE-${selectedDocId}`;
  const title = metadata?.title || `Evidence Container #${selectedDocId}`;
  const category = metadata?.category || "Digital Evidence";
  const isValid = docInfo?.isValid || false;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto text-left transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Chain-of-Custody &amp; Audit Portal</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Verifiable, court-admissible audit trail compiled from Ethereum event logs and cryptographic digests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadAuditData(selectedDocId)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? "Refreshing..." : "Refresh Audit"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowCertificate(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export Custody Certificate</span>
          </button>
        </div>
      </div>

      {/* Document Selector bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3 transition-colors">
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="number"
            min="1"
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            placeholder="Enter Evidence Container ID (e.g. 1)"
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Load Case
          </button>
        </form>

        {availableDocs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Quick Select:</span>
            {availableDocs.map((id) => (
              <button
                key={`quick-audit-${id}`}
                type="button"
                onClick={() => {
                  setDocIdInput(id);
                  setSelectedDocId(id);
                }}
                className={`px-2.5 py-0.5 rounded-md text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                  selectedDocId === id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                }`}
              >
                #{id}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Case Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-mono text-xs font-semibold border border-slate-200 dark:border-slate-700">
              {caseNumber}
            </span>
            <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded-md text-xs font-semibold">
              {category}
            </span>
          </div>
          <div>
            {isValid ? (
              <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800/60 inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Verified &amp; Admissible</span>
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800/60">
                In Review / Pending Consensus
              </span>
            )}
          </div>
        </div>

        {metadata?.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 italic">{metadata.description}</p>
        )}

        {/* Cryptographic Hashes bar with Dual-Identity rule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                SHA-256 Digest (Content Integrity)
              </span>
              {metadata?.sha256Hash && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(metadata.sha256Hash, "audit-sha")}
                  className="font-sans text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                >
                  {copiedKey === "audit-sha" ? <span className="text-emerald-600 font-medium">Copied!</span> : "Copy"}
                </button>
              )}
            </div>
            <p className="font-bold text-slate-900 dark:text-slate-100 break-all text-[11px]">
              {metadata?.sha256Hash || "Computed upon evidence upload"}
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                IPFS Content Identifier (CID)
              </span>
              {(metadata?.ipfsCid || docInfo?.ipfsHash) && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(metadata?.ipfsCid || docInfo?.ipfsHash, "audit-cid")}
                  className="font-sans text-[10px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                >
                  {copiedKey === "audit-cid" ? <span className="text-emerald-600 font-medium">Copied!</span> : "Copy"}
                </button>
              )}
            </div>
            <p className="font-bold text-indigo-600 dark:text-indigo-400 break-all text-[11px]">
              {metadata?.ipfsCid || docInfo?.ipfsHash || "Not uploaded yet"}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Timeline Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Immutable Audit Trail ({auditData.timeline.length} Events)
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Chronological Order (Earliest &rarr; Latest)
          </span>
        </div>

        <ChainOfCustodyTimeline timeline={auditData.timeline} />
      </div>

      {/* Printable Certificate Modal */}
      {showCertificate && (
        <CustodyCertificateModal
          metadata={metadata}
          docInfo={docInfo}
          timeline={auditData.timeline}
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}
