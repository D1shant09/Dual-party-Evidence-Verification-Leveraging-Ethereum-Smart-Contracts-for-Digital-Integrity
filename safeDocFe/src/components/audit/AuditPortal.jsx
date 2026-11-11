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
    <div className="p-6 space-y-6 max-w-4xl mx-auto text-left transition-colors">
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
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs cursor-pointer"
          >
            {loading ? "Refreshing..." : "Refresh Audit"}
          </button>
          <button
            type="button"
            onClick={() => setShowCertificate(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Custody Certificate
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
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
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
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border transition-colors cursor-pointer ${
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
        <div className="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs">
          &#9888; {error}
        </div>
      )}

      {/* Case Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3 transition-colors">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded font-mono text-xs font-semibold">
              {caseNumber}
            </span>
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 rounded text-xs font-semibold">
              {category}
            </span>
          </div>
          <div>
            {isValid ? (
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800/60">
                &#10003; Verified &amp; Admissible
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-full text-xs font-bold border border-amber-200 dark:border-amber-800/60">
                In Review / Pending Consensus
              </span>
            )}
          </div>
        </div>

        {metadata?.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 italic">{metadata.description}</p>
        )}

        {/* Cryptographic Hashes bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              SHA-256 Digest (Content Integrity)
            </span>
            <p className="font-bold text-slate-900 dark:text-slate-100 break-all text-[11px]">
              {metadata?.sha256Hash || "Computed upon evidence upload"}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="font-sans font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              IPFS Content Identifier (CID)
            </span>
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
