import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { uploadEvidence, calculateSHA256 } from "../../services/api";

/**
 * ChallengeModal — Contesting a force-updated evidence document (Algorithm 2)
 */
export default function ChallengeModal({ documentId, providerProof, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [sha256, setSha256] = useState("");
  const [witness, setWitness] = useState("");
  const [uploadState, setUploadState] = useState("idle"); // idle | hashing | uploading | signing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedProof, setCopiedProof] = useState(false);

  const { data: txHash, writeContract, isPending: isSignPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleCopyProof = () => {
    if (!providerProof) return;
    navigator.clipboard.writeText(providerProof);
    setCopiedProof(true);
    setTimeout(() => setCopiedProof(false), 2000);
  };

  const handleFile = async (selected) => {
    if (!selected) return;
    setFile(selected);
    setSha256("");
    setErrorMsg("");
    resetWrite();
    setUploadState("hashing");

    try {
      const hash = await calculateSHA256(selected);
      setSha256(hash);
      setUploadState("idle");
    } catch (err) {
      setErrorMsg("SHA-256 calculation failed: " + (err.message || err));
      setUploadState("error");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!file || !sha256) {
      setErrorMsg("Please select a counter-evidence file.");
      return;
    }

    if (!witness.trim()) {
      setErrorMsg("Please provide a witness statement or witness address.");
      return;
    }

    // Step 1: Upload counter-evidence file to IPFS
    setUploadState("uploading");
    let cid;
    try {
      const result = await uploadEvidence(file);
      cid = result.ipfsHash;
    } catch (err) {
      setErrorMsg("Failed to upload counter-evidence: " + (err.message || err));
      setUploadState("error");
      return;
    }

    // Step 2: Call challengeDocument(documentId, counterIpfsHash, witness)
    setUploadState("signing");
    resetWrite();
    try {
      writeContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "challengeDocument",
        args: [BigInt(documentId), cid, witness.trim()],
      });
    } catch (err) {
      setErrorMsg("Smart contract call failed: " + (err.message || err));
      setUploadState("error");
    }
  };

  useEffect(() => {
    if (isTxConfirmed && uploadState !== "done") {
      setUploadState("done");
      if (onSuccess) onSuccess();
    }
  }, [isTxConfirmed, uploadState, onSuccess]);

  useEffect(() => {
    if (writeError && (uploadState === "signing" || isSignPending)) {
      setUploadState("error");
    }
  }, [writeError, uploadState, isSignPending]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 text-left transition-colors">
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Challenge Document (Algorithm 2)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Contest unilateral force-update for Evidence Container <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">#{documentId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {providerProof && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg p-3 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-amber-800 dark:text-amber-200">Provider&apos;s Submitted Proof:</p>
              <button
                type="button"
                onClick={handleCopyProof}
                className="text-[11px] text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
              >
                {copiedProof ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="font-mono text-amber-900 dark:text-amber-300 break-all text-[11px]">{providerProof}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Counter-Evidence File
            </label>
            <input
              type="file"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 file:font-semibold hover:file:bg-slate-200 dark:hover:file:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg cursor-pointer"
            />
            {file && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-1 break-all">
                {file.name} (SHA-256: {sha256 || "Computing..."})
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Witness Statement / Address
            </label>
            <input
              type="text"
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
              placeholder="Witness Ethereum address (0x...) or official sworn testimony statement"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          {uploadState === "uploading" && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs flex items-center gap-2.5 border border-indigo-200 dark:border-indigo-800/60">
              <svg className="animate-spin w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Uploading counter-evidence payload to IPFS...</span>
            </div>
          )}

          {(uploadState === "signing" || isSignPending) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-lg text-xs flex items-center gap-2.5 border border-amber-200 dark:border-amber-800/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span>Confirm challengeDocument in your connected wallet...</span>
            </div>
          )}

          {isTxConfirming && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-lg text-xs flex items-center gap-2.5 border border-amber-200 dark:border-amber-800/60">
              <svg className="animate-spin w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Recording formal challenge on blockchain ledger...</span>
            </div>
          )}

          {uploadState === "done" && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs space-y-1 border border-emerald-200 dark:border-emerald-800/60">
              <div className="flex items-center gap-1.5 font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Challenge filed successfully!</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 pl-5.5">
                Container is now escalated to the Independent Validator arbitration queue.
              </p>
              {txHash && <p className="font-mono break-all text-[11px] pl-5.5">Tx: {txHash}</p>}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg text-xs border border-red-200 dark:border-red-800/60 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {writeError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg text-xs border border-red-200 dark:border-red-800/60 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{writeError.shortMessage || writeError.message || "Contract call failed."}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Close
            </button>
            {uploadState !== "done" && (
              <button
                type="submit"
                disabled={
                  !file ||
                  !witness.trim() ||
                  uploadState === "hashing" ||
                  uploadState === "uploading" ||
                  uploadState === "signing" ||
                  isSignPending ||
                  isTxConfirming
                }
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              >
                Submit Formal Challenge
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
