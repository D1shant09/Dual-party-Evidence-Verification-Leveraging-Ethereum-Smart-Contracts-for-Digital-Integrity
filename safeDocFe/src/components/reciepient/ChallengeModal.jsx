import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { uploadEvidence, calculateSHA256 } from "../../services/api";

/**
 * ChallengeModal — Contesting a force-updated evidence document (Algorithm 2)
 *
 * Props:
 *   documentId (string | number)
 *   providerProof (string)
 *   onClose () => void
 *   onSuccess () => void
 */
export default function ChallengeModal({ documentId, providerProof, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [sha256, setSha256] = useState("");
  const [witness, setWitness] = useState("");
  const [uploadState, setUploadState] = useState("idle"); // idle | hashing | uploading | signing | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const { data: txHash, writeContract, isPending: isSignPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 text-left transition-colors">
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Challenge Document (Algorithm 2)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Contest force-update for Document #{documentId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl font-bold disabled:opacity-40 cursor-pointer"
          >
            &times;
          </button>
        </div>

        {providerProof && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded p-3 text-xs space-y-1">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Provider&apos;s Submitted Proof:</p>
            <p className="font-mono text-amber-900 dark:text-amber-300 break-all">{providerProof}</p>
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
              className="block w-full text-xs text-slate-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-700 dark:file:text-indigo-300 file:font-semibold hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/60"
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
              placeholder="Witness Ethereum address (e.g. 0x...) or sworn testimony statement"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-400 font-mono"
            />
          </div>

          {uploadState === "uploading" && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 rounded text-xs flex items-center gap-2 border border-blue-200 dark:border-blue-800/60">
              <span className="animate-spin">&#9696;</span>
              <span>Uploading counter-evidence to IPFS...</span>
            </div>
          )}

          {(uploadState === "signing" || isSignPending) && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded text-xs flex items-center gap-2 border border-indigo-200 dark:border-indigo-800/60">
              <span>🦊</span>
              <span>Confirm challengeDocument in MetaMask...</span>
            </div>
          )}

          {isTxConfirming && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded text-xs flex items-center gap-2 border border-indigo-200 dark:border-indigo-800/60">
              <span className="animate-spin">&#9696;</span>
              <span>Recording challenge on blockchain...</span>
            </div>
          )}

          {uploadState === "done" && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200 rounded text-xs space-y-1 border border-emerald-200 dark:border-emerald-800/60">
              <p className="font-semibold">&#10003; Challenge filed successfully!</p>
              <p className="text-slate-600 dark:text-slate-300">
                Document is now flagged for review by authorized validators.
              </p>
              {txHash && <p className="font-mono break-all text-[11px]">Tx: {txHash}</p>}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded text-xs border border-red-200 dark:border-red-800/60">
              &#9888; {errorMsg}
            </div>
          )}

          {writeError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded text-xs border border-red-200 dark:border-red-800/60">
              &#9888; {writeError.shortMessage || writeError.message || "Contract call failed."}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md disabled:bg-slate-300 dark:disabled:bg-slate-700 transition-colors cursor-pointer"
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
