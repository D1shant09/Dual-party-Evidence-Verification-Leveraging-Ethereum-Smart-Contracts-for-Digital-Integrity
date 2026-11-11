import { useRef } from "react";

export default function CustodyCertificateModal({ metadata, docInfo, timeline = [], onClose }) {
  const certificateRef = useRef(null);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "N/A";
    return new Date(isoStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  };

  const docId = metadata?.evidenceId || "N/A";
  const caseNumber = metadata?.caseNumber || `CASE-${new Date().getFullYear()}-${docId}`;
  const title = metadata?.title || `Evidence Container #${docId}`;
  const category = metadata?.category || "Forensic / Digital Evidence";
  const cid = metadata?.ipfsCid || docInfo?.ipfsHash || "N/A";
  const sha256 = metadata?.sha256Hash || docInfo?.sha256Hash || "N/A";
  const provider = metadata?.provider || docInfo?.provider || "N/A";
  const recipient = metadata?.recipient || docInfo?.recipient || "N/A";
  const isValid = docInfo?.isValid || false;
  const isRejected = docInfo?.isRejected || false;
  const rejectionReason = docInfo?.rejectionReason || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 transition-colors">
        {/* Modal Header Actions (hidden during print) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-t-xl print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Chain-of-Custody Certificate</span>
            <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 font-semibold">
              Case {caseNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Certificate Body (printable - keep authentic legal certificate appearance) */}
        <div ref={certificateRef} className="p-8 space-y-6 overflow-y-auto text-left bg-white text-gray-900 rounded-b-xl font-sans print:p-0 print:m-0 print:overflow-visible">
          {/* Certificate Header */}
          <div className="text-center border-b-2 border-gray-900 pb-5 space-y-2">
            <div className="inline-block px-3 py-1 bg-gray-900 text-white text-[11px] font-mono tracking-widest uppercase rounded">
              DocSafe Evidence Chain Protocol &middot; Cryptographic Custody Seal
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900">
              Official Digital Evidence Chain-of-Custody Certificate
            </h1>
            <p className="text-xs text-gray-600 max-w-xl mx-auto">
              This document serves as an immutable, tamper-evident certificate verifying the provenance, cryptographic hash, and consensus verification record on the Ethereum distributed ledger.
            </p>
          </div>

          {/* Evidence Details Table */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 font-bold text-xs uppercase tracking-wider text-gray-700">
              1. Case &amp; Evidence Identification
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70 w-1/4">Case / Reference #:</td>
                  <td className="px-4 py-2 font-mono font-bold text-indigo-900">{caseNumber}</td>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70 w-1/4">Evidence ID:</td>
                  <td className="px-4 py-2 font-mono font-bold">#{docId}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70">Evidence Title:</td>
                  <td className="px-4 py-2 font-medium">{title}</td>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70">Category:</td>
                  <td className="px-4 py-2 font-medium">{category}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70">Verification Status:</td>
                  <td className="px-4 py-2">
                    {isRejected ? (
                      <span className="font-bold text-red-700">
                        &#10007; REJECTED / NON-ADMISSIBLE {rejectionReason ? `(${rejectionReason})` : ""}
                      </span>
                    ) : isValid ? (
                      <span className="font-bold text-emerald-800">
                        &#10003; VERIFIED &amp; COURT-ADMISSIBLE
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700">
                        PENDING CONSENSUS VALIDATION
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70">Certificate Generated:</td>
                  <td className="px-4 py-2 font-mono">{formatDate(new Date().toISOString())}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Custodial Identities */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 font-bold text-xs uppercase tracking-wider text-gray-700">
              2. Custodial Parties &amp; Ethereum Identities
            </div>
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70 w-1/4">Submitting Provider:</td>
                  <td className="px-4 py-2 font-mono break-all">{provider}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-semibold bg-gray-50/70">Authorizing Recipient:</td>
                  <td className="px-4 py-2 font-mono break-all">{recipient}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cryptographic Integrity Section */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 font-bold text-xs uppercase tracking-wider text-gray-700">
              3. Cryptographic Hashes &amp; Decentralized Storage Pointers
            </div>
            <div className="p-4 space-y-2 text-xs font-mono bg-gray-50">
              <div>
                <span className="font-sans font-bold text-gray-700">SHA-256 File Digest (Exact Bytes Fingerprint):</span>
                <p className="p-2 bg-white rounded border border-gray-200 break-all font-bold text-gray-900 mt-1">
                  {sha256}
                </p>
              </div>
              <div>
                <span className="font-sans font-bold text-gray-700">IPFS Content Identifier (CID):</span>
                <p className="p-2 bg-white rounded border border-gray-200 break-all text-indigo-900 font-bold mt-1">
                  {cid}
                </p>
              </div>
              <p className="text-[11px] text-gray-500 font-sans italic pt-1">
                Notice: Recalculating the SHA-256 hash of the evidence file retrieved from the IPFS CID must yield the identical 256-bit digest shown above to ensure absence of tampering.
              </p>
            </div>
          </div>

          {/* Complete Chronological Chain of Custody */}
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 font-bold text-xs uppercase tracking-wider text-gray-700">
              4. Chronological Ledger Audit Trail
            </div>
            <table className="w-full text-xs">
              <thead className="bg-gray-50 border-b border-gray-300 text-left font-bold text-gray-700">
                <tr>
                  <th className="px-3 py-2 w-12 text-center">#</th>
                  <th className="px-3 py-2">Lifecycle Stage</th>
                  <th className="px-3 py-2">Actor</th>
                  <th className="px-3 py-2">Block #</th>
                  <th className="px-3 py-2">Tx Hash</th>
                  <th className="px-3 py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                {timeline.map((event, i) => (
                  <tr key={`cert-${i}`} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 text-center font-bold text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-sans font-semibold text-gray-900">{event.title}</td>
                    <td className="px-3 py-2 truncate max-w-[120px]" title={event.actor}>
                      {event.actor?.startsWith("0x") ? `${event.actor.slice(0, 6)}...${event.actor.slice(-4)}` : event.actor}
                    </td>
                    <td className="px-3 py-2">{event.blockNumber ? `#${event.blockNumber}` : "—"}</td>
                    <td className="px-3 py-2 truncate max-w-[140px]" title={event.txHash}>
                      {event.txHash?.startsWith("0x") ? `${event.txHash.slice(0, 8)}...${event.txHash.slice(-6)}` : "—"}
                    </td>
                    <td className="px-3 py-2 font-sans text-gray-600">{formatDate(event.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legal Certification Attestation & Signatures */}
          <div className="pt-6 border-t border-gray-300 space-y-8">
            <p className="text-[11px] text-gray-600 italic">
              &quot;We hereby attest that the digital evidence identified herein has been preserved, authenticated, and verified through decentralized cryptographic consensus in compliance with chain-of-custody protocols.&quot;
            </p>

            <div className="grid grid-cols-2 gap-8 pt-4">
              <div className="border-t border-gray-800 pt-2 text-left">
                <p className="font-bold text-xs">Forensic Analyst / Submitting Officer</p>
                <p className="text-[11px] text-gray-500 font-mono">Digital Signature: {provider.slice(0, 16)}...</p>
              </div>
              <div className="border-t border-gray-800 pt-2 text-left">
                <p className="font-bold text-xs">Judicial Custodian / Authorized Recipient</p>
                <p className="text-[11px] text-gray-500 font-mono">Digital Signature: {recipient.slice(0, 16)}...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
