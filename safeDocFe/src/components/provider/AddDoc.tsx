import { useState } from 'react';
import { useAccount, useChainId, useSwitchChain, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { isAddress } from "viem";
import DocumentVerificationABI from "../../ABI/DocumentVerificationABI.json";
import { CONTRACT_ADDRESS } from "./../../constants/constants";
import { docSafeLocal } from "../../wagmi";

const AddDocumentButton = ({ onCreated }: { onCreated?: () => void }) => {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();
    const [recipient, setRecipient] = useState("");
    const [validationError, setValidationError] = useState("");

    const isLocalChain = chainId === docSafeLocal.id;

    // Execute the contract write operation
    const { data: hash, writeContract, isPending, isError, error, reset } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash });

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError("");
        reset();

        const trimmedRecipient = recipient.trim();
        if (!isAddress(trimmedRecipient)) {
            setValidationError("Please enter a valid Ethereum address (e.g. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8).");
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
        <div className="w-full p-6 bg-white rounded-lg shadow-md mt-10 max-w-xl mx-auto text-left">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Add New Document</h2>

            {!isConnected && (
                <div className="p-3 mb-4 bg-yellow-50 text-yellow-800 rounded border border-yellow-200 text-sm">
                    Please connect your wallet first.
                </div>
            )}

            {isConnected && !isLocalChain && (
                <div className="p-3 mb-4 bg-amber-50 text-amber-800 rounded border border-amber-200 text-sm flex justify-between items-center">
                    <span>You are connected to Chain {chainId}. Please switch to DocSafe Local Hardhat (31337).</span>
                    <button
                        type="button"
                        onClick={() => switchChain({ chainId: docSafeLocal.id })}
                        className="ml-2 px-3 py-1 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700"
                    >
                        Switch Network
                    </button>
                </div>
            )}

            <div className="mb-4 text-xs text-gray-500 font-mono">
                Contract: {CONTRACT_ADDRESS || "Not configured"}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="recipient" className="block text-sm font-medium text-gray-700">
                        Recipient Address
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
                        className="text-gray-900 mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono"
                        required
                    />
                </div>

                {validationError && (
                    <p className="text-sm text-red-600">{validationError}</p>
                )}

                <button
                    type="submit"
                    disabled={!isConnected || isPending || isConfirming}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isPending
                        ? "Confirm in Wallet..."
                        : isConfirming
                        ? "Mining Transaction..."
                        : "Add Empty Document"}
                </button>

                {hash && (
                    <p className="text-xs text-gray-600 font-mono break-all">
                        Tx Hash: {hash}
                    </p>
                )}

                {isConfirmed && (
                    <div className="p-3 bg-green-50 text-green-700 rounded border border-green-200 text-sm flex items-center justify-between">
                        <span>Document container created successfully on local chain!</span>
                        {onCreated && (
                            <button
                                type="button"
                                onClick={onCreated}
                                className="ml-3 px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded text-xs font-semibold shrink-0"
                            >
                                View in Records →
                            </button>
                        )}
                    </div>
                )}

                {isError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                        Error: {error?.shortMessage || error?.message || "Transaction failed. Please check local Hardhat node."}
                    </div>
                )}
            </form>
        </div>
    );
};

export default AddDocumentButton;
