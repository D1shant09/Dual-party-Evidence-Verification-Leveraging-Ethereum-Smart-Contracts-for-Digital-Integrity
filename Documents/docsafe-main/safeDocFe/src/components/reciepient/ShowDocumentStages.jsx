import { useEffect, useState, useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "./../../constants/constants";
import { docSafeLocal } from "../../wagmi";

const RecipientDocuments = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const { data: txHash, writeContract, isPending: isWritePending, error: writeError, reset } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isLocalChain = chainId === docSafeLocal.id;

  const fetchDocuments = useCallback(async () => {
    if (!address || !publicClient || !CONTRACT_ADDRESS) {
      setDocuments([]);
      return;
    }

    setLoading(true);
    setFetchError("");

    try {
      // 1. Fetch recipient document IDs using helper getRecipientDocs
      const docIds = await publicClient.readContract({
        abi: DocumentVerificationABI,
        address: CONTRACT_ADDRESS,
        functionName: "getRecipientDocs",
        args: [address],
      });

      if (!Array.isArray(docIds) || docIds.length === 0) {
        setDocuments([]);
        return;
      }

      // 2. Fetch details for each document
      const docDetails = await Promise.all(
        docIds.map(async (id) => {
          try {
            const data = await publicClient.readContract({
              abi: DocumentVerificationABI,
              address: CONTRACT_ADDRESS,
              functionName: "getDocument",
              args: [id],
            });
            return {
              id: id.toString(),
              ipfsHash: data.ipfsHash,
              provider: data.provider,
              recipient: data.recipient,
              isValid: data.isValid,
              isInChangePhase: data.isInChangePhase,
              proof: data.proof,
            };
          } catch (err) {
            console.error(`Failed to fetch doc ${id}:`, err);
            return null;
          }
        })
      );

      setDocuments(docDetails.filter(Boolean));
    } catch (error) {
      console.error("Error fetching documents:", error);
      setFetchError(error.message || "Could not fetch documents. Verify contract is deployed and chain is 31337.");
    } finally {
      setLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Refetch when write transaction confirms
  useEffect(() => {
    if (isTxSuccess) {
      fetchDocuments();
    }
  }, [isTxSuccess, fetchDocuments]);

  const handleApprove = (documentId) => {
    reset();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "approveDocumentChange",
      args: [BigInt(documentId)],
    });
  };

  const handleValidate = (documentId) => {
    reset();
    writeContract({
      abi: DocumentVerificationABI,
      address: CONTRACT_ADDRESS,
      functionName: "validateDocument",
      args: [BigInt(documentId)],
    });
  };

  if (!isConnected) {
    return (
      <div className="p-6 text-center text-gray-600">
        Please connect your wallet to view recipient documents.
      </div>
    );
  }

  if (!isLocalChain) {
    return (
      <div className="p-6 text-center text-amber-700 bg-amber-50 rounded border border-amber-200 m-4">
        Please switch to DocSafe Local Hardhat (Chain 31337) to view documents.
      </div>
    );
  }

  const approveForEmpty = documents.filter((doc) => !doc.ipfsHash && !doc.isValid);
  const needVerify = documents.filter((doc) => doc.ipfsHash && !doc.isValid && !doc.isInChangePhase);
  const challengeForceUpdate = documents.filter((doc) => doc.isInChangePhase);
  const validDocuments = documents.filter((doc) => doc.isValid);

  return (
    <div className="p-6 space-y-8 mt-4 max-w-4xl mx-auto text-left">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Recipient Documents</h2>
          <p className="text-sm text-gray-500">Connected: {address}</p>
        </div>
        <button
          type="button"
          onClick={fetchDocuments}
          disabled={loading}
          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-700 font-medium"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {fetchError && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          {fetchError}
        </div>
      )}

      {(isWritePending || isTxConfirming) && (
        <div className="p-3 bg-blue-50 text-blue-700 rounded border border-blue-200 text-sm">
          {isWritePending ? "Awaiting wallet confirmation..." : "Confirming transaction on local blockchain..."}
        </div>
      )}

      {writeError && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          Error: {writeError?.shortMessage || writeError?.message || "Transaction failed."}
        </div>
      )}

      <p className="text-sm font-medium text-gray-600">Total Documents: {documents.length}</p>

      {[{
        title: "Approve for Empty Documents",
        docs: approveForEmpty,
        message: "No documents awaiting recipient approval.",
        action: "approve"
      }, {
        title: "Documents Needing Verification",
        docs: needVerify,
        message: "No documents needing verification.",
        action: "validate"
      }, {
        title: "Documents in Challenge Phase",
        docs: challengeForceUpdate,
        message: "No documents in challenge phase.",
        action: null
      }, {
        title: "Valid Documents",
        docs: validDocuments,
        message: "No valid documents.",
        action: null
      }].map(({ title, docs, message, action }) => (
        <div key={title} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">{title} ({docs.length})</h3>
          {docs.length > 0 ? (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="p-4 bg-gray-50 rounded-md border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-gray-900">Document #{doc.id}</p>
                    <p className="text-xs text-gray-600 font-mono">Provider: {doc.provider}</p>
                    {doc.ipfsHash && (
                      <p className="text-xs text-gray-600 font-mono">IPFS Hash: {doc.ipfsHash}</p>
                    )}
                    {doc.proof && (
                      <p className="text-xs text-gray-600 font-mono">Proof: {doc.proof}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Status: {doc.isValid ? "Valid" : doc.isInChangePhase ? "In Challenge Phase" : "Awaiting Approval / Content"}
                    </p>
                  </div>

                  {action === "approve" && (
                    <button
                      type="button"
                      disabled={isWritePending || isTxConfirming}
                      onClick={() => handleApprove(doc.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                    >
                      Approve Change
                    </button>
                  )}

                  {action === "validate" && (
                    <button
                      type="button"
                      disabled={isWritePending || isTxConfirming}
                      onClick={() => handleValidate(doc.id)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded disabled:opacity-50"
                    >
                      Validate Document
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">{message}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default RecipientDocuments;
