import { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract, usePublicClient } from "wagmi";
import { isAddress } from "viem";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "./../../constants/constants";
import { docSafeLocal } from "../../wagmi";
import { initiateEvidenceMetadata } from "../../services/api";

const CATEGORIES = [
    "Forensic Report",
    "Photographic Evidence",
    "Audio Recording",
    "Video Surveillance",
    "Legal Document",
    "Toxicology / Lab Result",
    "Chain of Custody Form",
    "Other Evidence"
];

const AddDocumentButton = ({ onCreated }: { onCreated?: () => void }) => {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const publicClient = usePublicClient();
    const { switchChain } = useSwitchChain();

    // Form inputs
    const [recipient, setRecipient] = useState("");
    const [title, setTitle] = useState("");
    const [caseNumber, setCaseNumber] = useState("");
    const [category, setCategory] = useState("Forensic Report");
    const [description, setDescription] = useState("");
    const [validationError, setValidationError] = useState("");

    const isLocalChain = chainId === docSafeLocal.id;

    // Execute the contract write operation
    const { data: hash, writeContract, isPending, isError, error, reset } = useWriteContract();

    const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash });

    // When on-chain container is created, register metadata in backend database
    useEffect(() => {
        if (isConfirmed && receipt && publicClient && CONTRACT_ADDRESS) {
            (async () => {
                try {
                    const count = await publicClient.readContract({
                        abi: DocumentVerificationABI,
                        address: CONTRACT_ADDRESS,
                        functionName: "documentCount",
                    });
                    const docId = count.toString();
                    await initiateEvidenceMetadata({
                        evidenceId: docId,
                        provider: address || "",
                        recipient: recipient.trim(),
                        title: title.trim() || `Evidence Container #${docId}`,
                        category,
                        caseNumber: caseNumber.trim() || `CASE-${new Date().getFullYear()}-${docId}`,
                        description: description.trim(),
                    });
                } catch (err) {
                    console.error("Failed to persist evidence metadata:", err);
                }
            })();
        }
    }, [isConfirmed, receipt, publicClient, address, recipient, title, category, caseNumber, description]);

    // Handle form submission
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError("");
        reset();

        const trimmedRecipient = recipient.trim();
        if (!isAddress(trimmedRecipient)) {
            setValidationError("Please enter a valid Ethereum address for the recipient (e.g. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8).");
            return;
        }

        if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
            setValidationError("Contract address is not configured. Please run 'npm run deploy:local' on the local chain.");
            return;
        }

        writeContract({
            abi: DocumentVerificationABI,
            address: CONTRACT_ADDRESS,
            functionName: "addEmptyDocument",
            args: [trimmedRecipient],
        });
    };

    return (
        <div className="w-full p-6 bg-white dark:bg-slate-900 rounded-xl shadow-md dark:shadow-slate-950/50 mt-6 max-w-2xl mx-auto text-left border border-slate-200 dark:border-slate-800 transition-colors">
            <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-slate-100">Initiate Digital Evidence Container</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Stage 1 of 2: Creates an on-chain evidence record bound to the intended recipient and case metadata. No file is uploaded until the recipient authorizes the submission.
            </p>

            {!isConnected && (
                <div className="p-3 mb-4 bg-yellow-50 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-200 rounded-lg border border-yellow-200 dark:border-yellow-800/60 text-sm">
                    Please connect your wallet first.
                </div>
            )}

            {isConnected && !isLocalChain && (
                <div className="p-3 mb-4 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 dark:border-amber-800/60 text-sm flex justify-between items-center">
                    <span>You are connected to Chain {chainId}. Please switch to DocSafe Local Hardhat (31337).</span>
                    <button
                        type="button"
                        onClick={() => switchChain({ chainId: docSafeLocal.id })}
                        className="ml-2 px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 cursor-pointer"
                    >
                        Switch Network
                    </button>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Case Reference & Title */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="caseNumber" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Case / Reference #
                        </label>
                        <input
                            type="text"
                            id="caseNumber"
                            value={caseNumber}
                            onChange={(e) => setCaseNumber(e.target.value)}
                            placeholder="e.g. CR-2026-089"
                            className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-xs font-mono"
                        />
                    </div>
                    <div>
                        <label htmlFor="category" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                            Evidence Category
                        </label>
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-xs"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat} value={cat} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="title" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Evidence Title
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Ballistics Analysis & Chamber Markings"
                        className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-xs"
                        required
                    />
                </div>

                {/* Recipient Address */}
                <div>
                    <label htmlFor="recipient" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Authorized Recipient Ethereum Address
                    </label>
                    <input
                        type="text"
                        id="recipient"
                        value={recipient}
                        onChange={(e) => {
                            setRecipient(e.target.value);
                            if (validationError) setValidationError("");
                        }}
                        placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                        className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-xs font-mono"
                        required
                    />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Only this recipient account will be able to review and consent to the evidence container.
                    </p>
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Case Description & Chain-of-Custody Notes (Optional)
                    </label>
                    <textarea
                        id="description"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Forensic laboratory acquisition details, officer notes, or source context..."
                        className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 sm:text-xs"
                    />
                </div>

                {validationError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">{validationError}</p>
                )}

                <button
                    type="submit"
                    disabled={!isConnected || isPending || isConfirming}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-xs text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed uppercase tracking-wider transition-colors cursor-pointer"
                >
                    {isPending
                        ? "Confirm in Wallet..."
                        : isConfirming
                        ? "Registering Container on Chain..."
                        : "Initiate Evidence Container (Stage 1)"}
                </button>

                {hash && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono break-all">
                        Tx Hash: {hash}
                    </p>
                )}

                {isConfirmed && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-200 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center justify-between">
                        <div>
                            <p className="font-semibold">Evidence container initiated successfully!</p>
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Awaiting recipient authorization before evidence file upload.</p>
                        </div>
                        {onCreated && (
                            <button
                                type="button"
                                onClick={onCreated}
                                className="ml-3 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-semibold shrink-0 shadow-xs cursor-pointer"
                            >
                                View in Records →
                            </button>
                        )}
                    </div>
                )}

                {isError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 rounded-lg border border-red-200 dark:border-red-800/60 text-xs">
                        Error: {error?.shortMessage || error?.message || "Transaction failed. Please check local Hardhat node."}
                    </div>
                )}
            </form>
        </div>
    );
};

export default AddDocumentButton;
