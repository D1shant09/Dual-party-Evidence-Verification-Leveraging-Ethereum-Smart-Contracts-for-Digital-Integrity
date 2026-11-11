import { useState, useEffect } from "react";
import { fetchEvidence, calculateSHA256 } from "../../services/api";

const MIME_EXTENSION_MAP = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "text/plain": ".txt",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/x-matroska": ".mkv",
};

/**
 * EvidencePreview — renders preview & cryptographic fingerprint for an IPFS CID
 */
export default function EvidencePreview({ cid, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [contentType, setContentType] = useState("");
  const [computedSha256, setComputedSha256] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [copiedKey, setCopiedKey] = useState("");

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(""), 2000);
  };

  useEffect(() => {
    if (!cid) return;

    let activeUrl = null;
    let isCancelled = false;

    setLoading(true);
    setError("");

    (async () => {
      try {
        const { blob, contentType: ct } = await fetchEvidence(cid);
        if (isCancelled) return;

        activeUrl = URL.createObjectURL(blob);
        setObjectUrl(activeUrl);
        setContentType(ct);
        setFileSize(blob.size);

        // Compute cryptographic integrity fingerprint
        const hash = await calculateSHA256(blob);
        if (!isCancelled) {
          setComputedSha256(hash);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || "Failed to load evidence file from IPFS gateway.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [cid]);

  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = contentType.startsWith("image/");
  const isVideo = contentType.startsWith("video/");
  const isAudio = contentType.startsWith("audio/");
  const isPdf = contentType === "application/pdf";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs text-left transition-colors">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Decentralized Evidence Preview</h4>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-semibold cursor-pointer"
          >
            Hide Preview
          </button>
        )}
      </div>

      {loading && (
        <div className="p-4 text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-2.5">
          <svg className="animate-spin w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Fetching evidence content from IPFS via gateway...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg text-xs border border-red-200 dark:border-red-800/60 flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Metadata & Integrity verification */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 text-xs space-y-1.5 border border-slate-200 dark:border-slate-700/80">
            <div className="flex flex-wrap items-center justify-between text-slate-600 dark:text-slate-400 gap-2">
              <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
                <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">MIME:</span> {contentType || "binary/octet-stream"}
              </span>
              <span className="font-mono text-slate-900 dark:text-slate-100 font-medium">
                <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Size:</span> {formatBytes(fileSize)}
              </span>
            </div>

            {/* IPFS CID with copy button */}
            <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-semibold text-slate-500 dark:text-slate-400">IPFS CID: </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 break-all">{cid}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(cid, "cid")}
                className="shrink-0 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer inline-flex items-center gap-1"
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

            {/* SHA-256 fingerprint with copy button */}
            <div className="pt-1 border-t border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="font-semibold text-slate-500 dark:text-slate-400">SHA-256: </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium break-all">{computedSha256}</span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(computedSha256, "sha256")}
                className="shrink-0 text-[11px] text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer inline-flex items-center gap-1"
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
            </div>
          </div>

          {/* Media preview renderers */}
          <div className="flex justify-center bg-slate-100 dark:bg-slate-800/80 rounded-lg p-2 overflow-hidden border border-slate-200 dark:border-slate-700/80">
            {isImage && (
              <img
                src={objectUrl}
                alt="Digital Evidence"
                className="max-h-96 max-w-full rounded object-contain shadow-xs"
              />
            )}

            {isPdf && (
              <iframe
                src={objectUrl}
                title="Evidence PDF Preview"
                className="w-full h-96 rounded border border-slate-300 dark:border-slate-700 bg-white"
              />
            )}

            {isVideo && (
              <video
                controls
                src={objectUrl}
                className="max-h-96 w-full rounded"
              >
                Your browser does not support video playback.
              </video>
            )}

            {isAudio && (
              <audio controls src={objectUrl} className="w-full p-2">
                Your browser does not support audio playback.
              </audio>
            )}

            {!isImage && !isPdf && !isVideo && !isAudio && (
              <div className="p-6 text-center text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">Binary Document / Report</p>
                <p>In-browser preview not supported directly for this MIME type. Download file below to inspect.</p>
              </div>
            )}
          </div>

          {/* Download button */}
          {objectUrl && (
            <div className="flex justify-end pt-1">
              <a
                href={objectUrl}
                download={`evidence-${(cid || "").slice(0, 10)}${MIME_EXTENSION_MAP[contentType] || ""}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Download Evidence File</span>
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
