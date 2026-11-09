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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-left">
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Challenge Document (Algorithm 2)</h3>
            <p className="text-xs text-gray-500">Contest force-update for Document #{documentId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold disabled:opacity-40"
          >
            &times;
          </button>
        </div>

        {providerProof && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs space-y-1">
            <p className="font-semibold text-amber-800">Provider&apos;s Submitted Proof:</p>
            <p className="font-mono text-amber-900 break-all">{providerProof}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Counter-Evidence File
            </label>
            <input
              type="file"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="block w-full text-xs text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold hover:file:bg-indigo-100"
            />
            {file && (
              <p className="text-xs text-indigo-700 font-mono mt-1 break-all">
                {file.name} (SHA-256: {sha256 || "Computing..."})
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Witness Statement / Address
            </label>
            <input
              type="text"
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
              placeholder="Witness Ethereum address (e.g. 0x...) or sworn testimony statement"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
            />
          </div>

          {uploadState === "uploading" && (
            <div className="p-3 bg-blue-50 text-blue-700 rounded text-xs flex items-center gap-2">
              <span className="animate-spin">&#9696;</span>
              <span>Uploading counter-evidence to IPFS...</span>
            </div>
          )}

          {(uploadState === "signing" || isSignPending) && (
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded text-xs flex items-center gap-2">
              <span>🦊</span>
              <span>Confirm challengeDocument in MetaMask...</span>
            </div>
          )}

          {isTxConfirming && (
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded text-xs flex items-center gap-2">
              <span className="animate-spin">&#9696;</span>
              <span>Recording challenge on blockchain...</span>
            </div>
          )}

          {uploadState === "done" && (
            <div className="p-3 bg-green-50 text-green-700 rounded text-xs space-y-1">
              <p className="font-semibold">&#10003; Challenge filed successfully!</p>
              <p className="text-gray-600">
                Document is now flagged for review by authorized validators.
              </p>
              {txHash && <p className="font-mono break-all text-[11px]">Tx: {txHash}</p>}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 rounded text-xs">
              &#9888; {errorMsg}
            </div>
          )}

          {writeError && (
            <div className="p-3 bg-red-50 text-red-700 rounded text-xs">
              &#9888; {writeError.shortMessage || writeError.message || "Contract call failed."}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-3 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadState === "uploading" || uploadState === "signing" || isTxConfirming}
              className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
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
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md disabled:bg-gray-300"
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
