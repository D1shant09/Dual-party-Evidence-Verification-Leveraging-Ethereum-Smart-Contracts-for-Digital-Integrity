import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { recordReviewerDecision } from "../../services/api";

const PRESET_REASONS = [
  "Illegible or corrupted forensic scan",
  "SHA-256 fingerprint verification failed / hash mismatch",
  "Chain of custody broken / untrusted source transfer",
  "Incomplete evidentiary foundation / missing documentation",
  "Evidence appears tampered or materially altered",
  "Document filed under incorrect case or category",
];

export default function RejectModal({ documentId, onClose, onSuccess, userRole = "recipient" }) {
  const { address } = useAccount();
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const effectiveReason = customReason.trim() || selectedPreset;

  const {
    data: txHash,
    writeContract,
    isPending: isSignPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handlePresetChange = (val) => {
    setSelectedPreset(val);
    if (!customReason) {
      setCustomReason(val);
    }
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!effectiveReason) {
      setErrorMsg("Please select or enter a reason for rejecting this evidence submission.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    resetWrite();

    try {
      writeContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "rejectDocument",
        args: [BigInt(documentId), effectiveReason],
      });
    } catch (err) {
      setErrorMsg("Failed to initiate rejection: " + (err.message || err));
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (isTxConfirmed) {
      // Record to backend database for persistent audit trail
      recordReviewerDecision(String(documentId), {
        reviewerAddress: address || "Authorized Reviewer",
        role: userRole,
        decision: "rejected",
        reason: effectiveReason,
        txHash: txHash || "",
      }).catch((err) => console.warn("Backend decision recording warning:", err));

      setSubmitting(false);
      if (onSuccess) onSuccess();
    }
  }, [isTxConfirmed, documentId, address, userRole, effectiveReason, txHash, onSuccess]);

  useEffect(() => {
    if (writeError) {
      setErrorMsg(writeError.shortMessage || writeError.message || "Smart contract rejection failed.");
      setSubmitting(false);
    }
  }, [writeError]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in text-left">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-red-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-lg shadow-sm">
              !
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Formal Evidence Rejection</h3>
              <p className="text-xs text-gray-500 font-mono">Evidence Container #{documentId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
          <div className="p-3 bg-red-50/70 rounded-xl border border-red-200/60 text-xs text-red-900 leading-relaxed">
            <strong className="font-semibold block mb-0.5">Algorithm 2 Rollback Semantics:</strong>
            Rejecting this evidence marks this container as rejected on-chain, preventing further modification or approval.
            The provider will be notified to submit a linked resubmission with corrected evidence.
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Standard Rejection Justification
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">-- Choose a standard reason --</option>
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Detailed Rejection Reason / Forensic Findings <span className="text-red-500">*</span>
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Specify the exact forensic discrepancy, unreadable pages, or chain of custody violation..."
              rows={3}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          {(isSignPending || isTxConfirming) && (
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs flex items-center gap-2">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full" />
              <span>
                {isSignPending ? "Please sign rejection in MetaMask..." : "Recording rejection on blockchain..."}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || isSignPending || isTxConfirming}
              className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isSignPending || isTxConfirming || !effectiveReason}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting || isSignPending || isTxConfirming ? "Processing..." : "Confirm Formal Rejection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
