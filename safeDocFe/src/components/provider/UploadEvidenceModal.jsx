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
 */
export default function UploadEvidenceModal({ documentId, onClose, onSuccess }) {
  const { address } = useAccount();
  const [file, setFile] = useState(null);
  const [sha256, setSha256] = useState("");
  const [uploadState, setUploadState] = useState("idle"); // idle | hashing | uploading | signing | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [ipfsCid, setIpfsCid] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [copiedKey, setCopiedKey] = useState("");
  const fileInputRef = useRef(null);

  const { data: txHash, writeContract, isPending: isSignPending, error: writeError, reset: resetWrite } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg flex flex-col gap-5 p-6 text-left transition-colors">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Upload Digital Evidence</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Document Container <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">#{documentId}</span>
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

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40"
              : "border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800/40"
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
              <div className="w-8 h-8 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click or drag another file to replace</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Drag &amp; drop evidence here, or <span className="text-indigo-600 dark:text-indigo-400 font-semibold underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{ALLOWED_LABEL} &middot; Max 100 MB</p>
            </div>
          )}
        </div>

        {/* File metadata & cryptographic hash */}
        {file && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3.5 space-y-2 text-xs border border-slate-200 dark:border-slate-700/80">
            <div className="flex flex-wrap justify-between text-slate-600 dark:text-slate-400 gap-2">
              <span><strong className="text-slate-700 dark:text-slate-300">Name:</strong> {file.name}</span>
              <span><strong className="text-slate-700 dark:text-slate-300">Size:</strong> {formatBytes(file.size)}</span>
              <span><strong className="text-slate-700 dark:text-slate-300">Type:</strong> {file.type || "Unknown binary"}</span>
            </div>

            {/* SHA-256 with Dual-Identity rule */}
            <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-600 dark:text-slate-400">SHA-256 Fingerprint:</span>
                {sha256 && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(sha256, "sha256")}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  >
                    {copiedKey === "sha256" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {uploadState === "hashing" ? (
                <div className="flex items-center gap-2 mt-1 text-amber-600 dark:text-amber-400 italic">
                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Computing 256-bit cryptographic digest...</span>
                </div>
              ) : (
                <p className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-medium break-all mt-0.5">
                  {sha256}
                </p>
              )}
            </div>

            {/* IPFS CID with Dual-Identity rule */}
            {ipfsCid && (
              <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">IPFS CID:</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(ipfsCid, "cid")}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  >
                    {copiedKey === "cid" ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copied!</span>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-medium break-all mt-0.5">
                  {ipfsCid}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Progress & Feedback */}
        {uploadState === "uploading" && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-xs flex items-center gap-2.5">
            <svg className="animate-spin w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Uploading file payload to IPFS decentralized gateway...</span>
          </div>
        )}

        {(uploadState === "signing" || isSignPending) && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-xs flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span>Please confirm transaction in your connected wallet...</span>
          </div>
        )}

        {isTxConfirming && (
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-200 rounded-lg border border-indigo-200 dark:border-indigo-800/60 text-xs flex items-center gap-2.5">
            <svg className="animate-spin w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Recording CID and SHA-256 fingerprint on local blockchain ledger...</span>
          </div>
        )}

        {uploadState === "done" && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Evidence successfully uploaded and immutably recorded on-chain!</span>
            </div>
            {txHash && (
              <p className="font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all pl-5.5">
                Tx: {txHash}
              </p>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {writeError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{writeError.shortMessage || writeError.message || "Smart contract transaction failed."}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
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
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed shadow-xs transition-colors cursor-pointer"
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
