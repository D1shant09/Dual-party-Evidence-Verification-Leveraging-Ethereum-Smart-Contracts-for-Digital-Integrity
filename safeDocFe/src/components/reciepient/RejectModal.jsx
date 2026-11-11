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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-red-100 dark:border-red-950/60 overflow-hidden transition-colors">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 border-b border-red-100 dark:border-red-900/40 flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 flex items-center justify-center font-bold text-lg shadow-xs">
              !
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Formal Evidence Rejection</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">Evidence Container #{documentId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleConfirmReject} className="p-6 space-y-4">
          <div className="p-3 bg-red-50/70 dark:bg-red-950/30 rounded-xl border border-red-200/60 dark:border-red-900/40 text-xs text-red-900 dark:text-red-200 leading-relaxed">
            <strong className="font-semibold block mb-0.5">Algorithm 2 Rollback Semantics:</strong>
            Rejecting this evidence marks this container as rejected on-chain, preventing further modification or approval.
            The provider will be notified to submit a linked resubmission with corrected evidence.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Standard Rejection Justification
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-red-400"
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">-- Choose a standard reason --</option>
              {PRESET_REASONS.map((r) => (
                <option key={r} value={r} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Detailed Rejection Reason / Forensic Findings <span className="text-red-500">*</span>
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Specify the exact forensic discrepancy, unreadable pages, or chain of custody violation..."
              rows={3}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-red-400"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-200 rounded-lg text-xs">
              {errorMsg}
            </div>
          )}

          {(isSignPending || isTxConfirming) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 rounded-lg text-xs flex items-center gap-2">
              <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full" />
              <span>
                {isSignPending ? "Please sign rejection in MetaMask..." : "Recording rejection on blockchain..."}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting || isSignPending || isTxConfirming}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isSignPending || isTxConfirming || !effectiveReason}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {submitting || isSignPending || isTxConfirming ? "Processing..." : "Confirm Formal Rejection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
