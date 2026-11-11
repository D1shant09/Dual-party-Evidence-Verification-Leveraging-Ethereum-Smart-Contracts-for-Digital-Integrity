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
 *
 * Props:
 *   cid (string) — IPFS content identifier
 *   onClose () => void (optional)
 */
export default function EvidencePreview({ cid, onClose }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [contentType, setContentType] = useState("");
  const [computedSha256, setComputedSha256] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fileSize, setFileSize] = useState(0);

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
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Decentralized Evidence Preview</h4>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-semibold cursor-pointer"
          >
            Hide
          </button>
        )}
      </div>

      {loading && (
        <div className="p-4 text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-2">
          <span className="animate-spin text-base">&#9696;</span>
          <span>Fetching evidence content from IPFS via local gateway...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded text-xs border border-red-200 dark:border-red-800/60">
          &#9888; {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Metadata & Integrity verification */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-md p-3 text-xs font-mono space-y-1 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400 font-sans font-semibold">
              MIME: <span className="font-mono text-slate-900 dark:text-slate-100">{contentType || "binary/octet-stream"}</span>
              <span className="ml-3 font-sans font-semibold">Size:</span>{" "}
              <span className="font-mono text-slate-900 dark:text-slate-100">{formatBytes(fileSize)}</span>
            </p>
            <p className="break-all text-slate-700 dark:text-slate-300">
              <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">IPFS CID:</span> {cid}
            </p>
            <p className="break-all text-emerald-700 dark:text-emerald-400">
              <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">SHA-256 Fingerprint:</span>{" "}
              <span className="font-bold">{computedSha256}</span>
            </p>
          </div>

          {/* Media preview renderers */}
          <div className="flex justify-center bg-slate-100 dark:bg-slate-800/80 rounded p-2 overflow-hidden border border-slate-200 dark:border-slate-700">
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
                <p className="font-semibold">Binary Document / Report</p>
                <p>Preview rendering not supported directly in browser for this file type.</p>
              </div>
            )}
          </div>

          {/* Download button */}
          {objectUrl && (
            <div className="flex justify-end pt-1">
              <a
                href={objectUrl}
                download={`evidence-${(cid || "").slice(0, 10)}${MIME_EXTENSION_MAP[contentType] || ""}`}
                className="inline-flex items-center px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded shadow-xs transition-colors cursor-pointer"
              >
                Download Evidence File
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}
