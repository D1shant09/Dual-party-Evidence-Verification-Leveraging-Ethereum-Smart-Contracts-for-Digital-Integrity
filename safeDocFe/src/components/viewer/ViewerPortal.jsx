import { useState, useEffect, useCallback } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "../../constants/constants";
import { docSafeLocal } from "../../wagmi";
import EvidencePreview from "../reciepient/EvidencePreview";

export default function ViewerPortal() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [docIdInput, setDocIdInput] = useState("");
  const [cid, setCid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [docInfo, setDocInfo] = useState(null);
  const [associatedDocs, setAssociatedDocs] = useState([]);

  const isLocalChain = chainId === docSafeLocal.id;

  // Fetch documents associated with connected wallet as provider or recipient
  useEffect(() => {
    if (!address || !publicClient || !CONTRACT_ADDRESS) {
      setAssociatedDocs([]);
      return;
    }
    (async () => {
      try {
        const [pDocs, rDocs] = await Promise.all([
          publicClient.readContract({
            abi: DocumentVerificationABI,
            address: CONTRACT_ADDRESS,
            functionName: "getProviderDocs",
            args: [address],
          }),
          publicClient.readContract({
            abi: DocumentVerificationABI,
            address: CONTRACT_ADDRESS,
            functionName: "getRecipientDocs",
            args: [address],
          }),
        ]);

        const items = [];
        if (Array.isArray(pDocs)) {
          pDocs.forEach((id) => items.push({ id: id.toString(), role: "Provider" }));
        }
        if (Array.isArray(rDocs)) {
          rDocs.forEach((id) => items.push({ id: id.toString(), role: "Recipient" }));
        }
        setAssociatedDocs(items);
      } catch (err) {
        console.error("Failed to load associated documents:", err);
      }
    })();
  }, [address, publicClient]);

  const performLookup = useCallback(async (targetId) => {
    setError("");
    setCid(null);
    setDocInfo(null);

    const id = parseInt(targetId, 10);
    if (isNaN(id) || id < 1) {
      setError("Please enter a valid positive Document ID.");
      return;
    }

    if (!address || !publicClient || !CONTRACT_ADDRESS) {
      setError("Please connect your wallet first.");
      return;
    }

    setLoading(true);

    try {
      // Call viewDocument with caller account to test viewers[msg.sender][documentId]
      const ipfsHash = await publicClient.readContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "viewDocument",
        args: [BigInt(id)],
        account: address,
      });

      // Also read public metadata
      const doc = await publicClient.readContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "getDocument",
        args: [BigInt(id)],
        account: address,
      });

      setCid(ipfsHash);
      setDocInfo(doc);
    } catch (err) {
      const msg = err.shortMessage || err.message || "";
      if (
        msg.toLowerCase().includes("not approved") ||
        msg.toLowerCase().includes("revert") ||
        msg.toLowerCase().includes("denied")
      ) {
        setError(
          `Access Denied: Address ${address} has not been granted viewer authorization for Document #${id}. Please request access from the recipient.`
        );
      } else {
        setError(`Failed to retrieve document: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  const handleLookup = (e) => {
    if (e) e.preventDefault();
    performLookup(docIdInput);
  };

  if (!isConnected) {
    return (
      <div className="p-6 text-center text-gray-600 bg-white rounded-lg shadow-sm max-w-xl mx-auto mt-6">
        Please connect your wallet to access the Authorized Viewer Portal.
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-700 bg-amber-50 rounded-lg border border-amber-200 max-w-xl mx-auto mt-6">
        Please switch to DocSafe Local Hardhat (Chain 31337).
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-left space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Authorized Viewer Portal</h2>
        <p className="text-xs text-gray-500 mt-1">
          Inspect and verify digital evidence records you have been granted permission to access.
        </p>
      </div>

      {/* Document lookup form */}
      <form onSubmit={handleLookup} className="flex gap-3">
        <input
          type="number"
          min="1"
          value={docIdInput}
          onChange={(e) => setDocIdInput(e.target.value)}
          placeholder="Enter Document ID (e.g. 1)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          type="submit"
          disabled={loading || !docIdInput}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-md disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm transition-colors"
        >
          {loading ? "Verifying Authorization..." : "View Document"}
        </button>
      </form>

      {/* Quick select associated documents */}
      {associatedDocs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>Quick Select:</span>
          {associatedDocs.map((item, idx) => (
            <button
              key={`${item.id}-${item.role}-${idx}`}
              type="button"
              onClick={() => {
                setDocIdInput(item.id);
                performLookup(item.id);
              }}
              className="px-2.5 py-1 bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md border border-gray-200 font-mono transition-colors text-xs font-semibold"
            >
              Doc #{item.id} ({item.role})
            </button>
          ))}
        </div>
      )}

      {/* Access Denied / Error alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-1">
          <p className="font-bold text-sm">&#9888; Authorization Check</p>
          <p>{error}</p>
        </div>
      )}

      {/* Authorized document inspection */}
      {docInfo && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="border-b pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-gray-900">Document #{docIdInput}</h3>
              {docInfo.isValid ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  &#10003; Validated Evidence
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Pending Full Validation
                </span>
              )}
            </div>
            <div className="mt-2 text-xs font-mono text-gray-600 space-y-1">
              <p>
                <span className="font-sans font-semibold text-gray-500">Provider:</span> {docInfo.provider}
              </p>
              <p>
                <span className="font-sans font-semibold text-gray-500">Recipient:</span> {docInfo.recipient}
              </p>
              <p className="break-all">
                <span className="font-sans font-semibold text-gray-500">IPFS CID:</span>{" "}
                {cid ? cid : <span className="text-amber-700 font-sans italic">Not yet uploaded</span>}
              </p>
            </div>
          </div>

          {cid ? (
            <EvidencePreview cid={cid} />
          ) : (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
              Authorization confirmed. You are approved to view this container, but the provider has not yet uploaded the evidence file.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
