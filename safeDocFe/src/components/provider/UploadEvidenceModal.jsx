import { useState, useRef, useCallback, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { uploadEvidence, calculateSHA256 } from "../../services/api";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const ALLOWED_LABEL = "PDF, DOCX, TXT, PNG, JPG, WEBP, MP3, WAV, OGG, MP4, MOV, AVI";

/**
 * UploadEvidenceModal — shown when the recipient has approved a document container.
 *
 * Props:
 *   documentId (string | number) — the on-chain document ID to update
 *   onClose () => void           — called when modal is closed
 *   onSuccess () => void         — called after on-chain updateDocument confirms
 */
export default function UploadEvidenceModal({ documentId, onClose, onSuccess }) {
  const { address } = useAccount();
  const [file, setFile] = useState(null);
  const [sha256, setSha256] = useState("");
  const [uploadState, setUploadState] = useState("idle"); // idle | hashing | uploading | signing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [ipfsCid, setIpfsCid] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const { data: txHash, writeContract, isPending: isSignPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleFile = useCallback(async (selected) => {
    if (!selected) return;

    if (!ALLOWED_TYPES.includes(selected.type) && selected.type !== "") {
      setErrorMsg(`File type "${selected.type || "unknown"}" is not permitted. Allowed: ${ALLOWED_LABEL}`);
      return;
    }

    if (selected.size > 100 * 1024 * 1024) {
      setErrorMsg("File exceeds the maximum 100 MB limit.");
      return;
    }

    setFile(selected);
    setErrorMsg("");
    setSha256("");
    setIpfsCid("");
    resetWrite();

    setUploadState("hashing");
    try {
      const hash = await calculateSHA256(selected);
      setSha256(hash);
      setUploadState("idle");
    } catch (err) {
      setErrorMsg("Failed to compute SHA-256 hash: " + (err.message || err));
      setUploadState("error");
    }
  }, [resetWrite]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file || !sha256) return;
    setErrorMsg("");
    resetWrite();

    // Step 1: Upload to IPFS via backend (reuse existing CID if already uploaded)
    let cid = ipfsCid;
    if (!cid) {
      setUploadState("uploading");
      try {
        const result = await uploadEvidence(file, String(documentId), address);
        cid = result.ipfsHash;
        setIpfsCid(cid);
      } catch (err) {
        setErrorMsg("IPFS upload failed: " + (err.message || err));
        setUploadState("error");
        return;
      }
    }

    // Step 2: Call updateDocument on-chain with IPFS CID and SHA-256 fingerprint
    setUploadState("signing");
    try {
      writeContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "updateDocument",
        args: [BigInt(documentId), cid, sha256],
      });
    } catch (err) {
      setErrorMsg("Contract write rejected: " + (err.message || err));
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

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col gap-5 p-6 text-left transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Upload Digital Evidence</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Document Container <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">#{documentId}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl leading-none font-bold disabled:opacity-40 cursor-pointer"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
              : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/60"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.webp,.mp3,.wav,.ogg,.mp4,.mov,.avi,.mkv"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {file ? (
            <div className="space-y-1">
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click or drag another file to replace</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Drag & drop evidence here, or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{ALLOWED_LABEL} &middot; Max 100 MB</p>
            </>
          )}
        </div>

        {/* File metadata & cryptographic hash */}
        {file && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 space-y-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <p><span className="font-semibold text-slate-500 dark:text-slate-400 font-sans">Name:</span> {file.name}</p>
            <p><span className="font-semibold text-slate-500 dark:text-slate-400 font-sans">Size:</span> {formatBytes(file.size)}</p>
            <p><span className="font-semibold text-slate-500 dark:text-slate-400 font-sans">Type:</span> {file.type || "Unknown binary"}</p>
            <p className="break-all">
              <span className="font-semibold text-slate-500 dark:text-slate-400 font-sans">SHA-256 Fingerprint:</span>{" "}
              {uploadState === "hashing" ? (
                <span className="text-amber-600 dark:text-amber-400 italic font-sans">Computing hash...</span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">{sha256}</span>
              )}
            </p>
            {ipfsCid && (
              <p className="break-all">
                <span className="font-semibold text-slate-500 dark:text-slate-400 font-sans">IPFS CID:</span>{" "}
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">{ipfsCid}</span>
              </p>
            )}
          </div>
        )}

        {/* Progress & Feedback */}
        {uploadState === "uploading" && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 rounded-md border border-blue-200 dark:border-blue-800/60 text-sm flex items-center gap-2">
            <span className="animate-spin text-base">&#9696;</span>
            <span>Uploading file to IPFS storage gateway...</span>
          </div>
        )}

        {(uploadState === "signing" || isSignPending) && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-md border border-indigo-200 dark:border-indigo-800/60 text-sm flex items-center gap-2">
            <span>🦊</span>
            <span>Confirm transaction in MetaMask to bind CID to the smart contract...</span>
          </div>
        )}

        {isTxConfirming && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-md border border-indigo-200 dark:border-indigo-800/60 text-sm flex items-center gap-2">
            <span className="animate-spin text-base">&#9696;</span>
            <span>Recording CID on local Hardhat blockchain...</span>
          </div>
        )}

        {uploadState === "done" && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200 rounded-md border border-emerald-200 dark:border-emerald-800/60 text-sm space-y-1">
            <p className="font-semibold">&#10003; Evidence successfully uploaded and recorded on-chain!</p>
            {txHash && (
              <p className="font-mono text-xs text-slate-600 dark:text-slate-400 break-all">
                Tx: {txHash}
              </p>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800/60 text-sm">
            &#9888; {errorMsg}
          </div>
        )}

        {writeError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800/60 text-sm">
            &#9888; {writeError.shortMessage || writeError.message || "Smart contract transaction failed."}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
            className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {uploadState === "done" ? "Close" : "Cancel"}
          </button>

          {uploadState !== "done" && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                !file ||
                !sha256 ||
                uploadState === "hashing" ||
                uploadState === "uploading" ||
                uploadState === "signing" ||
                isSignPending ||
                isTxConfirming
              }
              className="px-5 py-2 rounded-md bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
            >
              {uploadState === "uploading"
                ? "Uploading to IPFS..."
                : uploadState === "signing" || isSignPending
                ? "Sign in Wallet..."
                : isTxConfirming
                ? "Mining Tx..."
                : "Upload & Record on Chain"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
