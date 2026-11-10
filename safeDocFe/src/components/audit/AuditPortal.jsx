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
    <div className="p-6 space-y-6 max-w-4xl mx-auto text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chain-of-Custody &amp; Audit Portal</h2>
          <p className="text-xs text-gray-500 mt-1">
            Verifiable, court-admissible audit trail compiled from Ethereum event logs and cryptographic digests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadAuditData(selectedDocId)}
            disabled={loading}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-semibold text-gray-700 transition-colors shadow-2xs"
          >
            {loading ? "Refreshing..." : "Refresh Audit"}
          </button>
          <button
            type="button"
            onClick={() => setShowCertificate(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Custody Certificate
          </button>
        </div>
      </div>

      {/* Document Selector bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            type="number"
            min="1"
            value={docIdInput}
            onChange={(e) => setDocIdInput(e.target.value)}
            placeholder="Enter Evidence Container ID (e.g. 1)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-md shadow-xs transition-colors"
          >
            Load Case
          </button>
        </form>

        {availableDocs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span className="font-semibold text-gray-600">Quick Select:</span>
            {availableDocs.map((id) => (
              <button
                key={`quick-audit-${id}`}
                type="button"
                onClick={() => {
                  setDocIdInput(id);
                  setSelectedDocId(id);
                }}
                className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold border transition-colors ${
                  selectedDocId === id
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
                }`}
              >
                #{id}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs">
          &#9888; {error}
        </div>
      )}

      {/* Case Overview Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">{title}</h3>
            <span className="px-2 py-0.5 bg-gray-200 text-gray-800 rounded font-mono text-xs font-semibold">
              {caseNumber}
            </span>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
              {category}
            </span>
          </div>
          <div>
            {isValid ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                &#10003; Verified &amp; Admissible
              </span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                In Review / Pending Consensus
              </span>
            )}
          </div>
        </div>

        {metadata?.description && (
          <p className="text-xs text-gray-600 italic">{metadata.description}</p>
        )}

        {/* Cryptographic Hashes bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-mono">
          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1">
            <span className="font-sans font-bold text-gray-500 uppercase tracking-wider text-[10px]">
              SHA-256 Digest (Content Integrity)
            </span>
            <p className="font-bold text-gray-900 break-all text-[11px]">
              {metadata?.sha256Hash || "Computed upon evidence upload"}
            </p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded border border-gray-200 space-y-1">
            <span className="font-sans font-bold text-gray-500 uppercase tracking-wider text-[10px]">
              IPFS Content Identifier (CID)
            </span>
            <p className="font-bold text-indigo-700 break-all text-[11px]">
              {metadata?.ipfsCid || docInfo?.ipfsHash || "Not uploaded yet"}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Timeline Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">
            Immutable Audit Trail ({auditData.timeline.length} Events)
          </h3>
          <span className="text-xs text-gray-500 font-mono">
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
