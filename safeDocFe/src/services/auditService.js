import { decodeEventLog } from "viem";
import DocumentVerificationABI from "../ABI/DocumentVerificationABI.json";
import { fetchAuditEvents, fetchEvidenceMetadata } from "./api";

/**
 * Maps raw contract event names to friendly human-readable titles, descriptions, and badge styles.
 */
function formatContractEvent(eventName, args, txHash, blockNumber, timestamp) {
  switch (eventName) {
    case "DocumentAdded":
      return {
        type: "ON_CHAIN",
        title: "Container Initialized On-Chain",
        description: `Evidence container created by provider ${args.provider} assigned to recipient ${args.recipient}.`,
        actor: args.provider,
        role: "Evidence Provider",
        badge: "Container Created",
        badgeColor: "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
    case "DocumentUpdated":
      return {
        type: "ON_CHAIN",
        title: "Evidence Registered & IPFS Pinned",
        description: `Evidence file uploaded to IPFS. Content Identifier (CID): ${args.newIpfsHash}`,
        actor: "Evidence Provider",
        role: "Evidence Provider",
        badge: "IPFS Ingested",
        badgeColor: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
        cid: args.newIpfsHash,
      };
    case "DocumentValidated":
      return {
        type: "ON_CHAIN",
        title: "Verification Consensus Confirmed",
        description: `Evidence successfully verified on-chain by authorized reviewer ${args.validator}.`,
        actor: args.validator,
        role: "Reviewer / Validator",
        badge: "Verified",
        badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
    case "DocumentChallenge":
      return {
        type: "ON_CHAIN",
        title: "Algorithm 2 Force Update / Challenge",
        description: args.witness
          ? `Recipient contested revision with witness: "${args.witness}". Revised Hash: ${args.newIpfsHash}`
          : `Provider initiated force update with proof: "${args.proof}". Revised Hash: ${args.newIpfsHash}`,
        actor: args.witness ? "Recipient" : "Provider",
        role: args.witness ? "Contesting Recipient" : "Revising Provider",
        badge: args.witness ? "Contested" : "Revision Proposed",
        badgeColor: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
    case "ViewerApproved":
      return {
        type: "ON_CHAIN",
        title: "Third-Party Viewer Access Granted",
        description: `Recipient granted viewer permission to address ${args.viewer}.`,
        actor: args.viewer,
        role: "Authorized Viewer",
        badge: "Access Granted",
        badgeColor: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
    case "ViewerRevoked":
      return {
        type: "ON_CHAIN",
        title: "Third-Party Viewer Access Revoked",
        description: `Recipient revoked viewer permission for address ${args.viewer}.`,
        actor: args.viewer,
        role: "Revoked Viewer",
        badge: "Access Revoked",
        badgeColor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
    case "DocumentRejected":
      return {
        type: "ON_CHAIN",
        title: "Evidence Formally Rejected",
        description: `Evidence submission rejected by reviewer ${args.reviewer}. Reason: "${args.reason}".`,
        actor: args.reviewer,
        role: "Reviewer / Validator",
        badge: "Rejected",
        badgeColor: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
    case "DocumentResubmitted":
      return {
        type: "ON_CHAIN",
        title: "Linked Resubmission Initiated",
        description: `Provider initiated new linked evidence container #${args.newDocumentId} succeeding rejected container #${args.previousDocumentId}.`,
        actor: "Evidence Provider",
        role: "Evidence Provider",
        badge: "Resubmitted",
        badgeColor: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
    default:
      return {
        type: "ON_CHAIN",
        title: eventName,
        description: JSON.stringify(args),
        actor: "System",
        role: "Contract",
        badge: eventName,
        badgeColor: "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
        txHash,
        blockNumber: Number(blockNumber),
        timestamp,
      };
  }
}

/**
 * Fetches the complete, aggregated audit trail for a specific evidence item.
 * Combines on-chain event logs with backend database audit records.
 *
 * @param {object} publicClient - Viem public client instance
 * @param {string} contractAddress - Deployed contract address
 * @param {string|number} documentId - Target evidence ID
 * @returns {Promise<{ metadata: object, timeline: Array<object> }>}
 */
export async function fetchCompleteAuditTrail(publicClient, contractAddress, documentId) {
  const docIdStr = String(documentId);
  const docIdBigInt = BigInt(documentId);

  // 1. Fetch backend metadata & audit events in parallel
  const [metaRes, backendEvents] = await Promise.all([
    fetchEvidenceMetadata(docIdStr),
    fetchAuditEvents(docIdStr),
  ]);

  const metadata = metaRes?.metadata || null;
  const decisions = metaRes?.decisions || [];

  const timeline = [];

  // 2. Fetch and decode on-chain logs if publicClient is available
  if (publicClient && contractAddress) {
    try {
      const rawLogs = await publicClient.getLogs({
        address: contractAddress,
        fromBlock: 0n,
        toBlock: "latest",
      });

      // Filter and decode logs for this document
      const docLogs = [];
      for (const log of rawLogs) {
        try {
          const decoded = decodeEventLog({
            abi: DocumentVerificationABI,
            data: log.data,
            topics: log.topics,
          });

          if (
            decoded.args &&
            (decoded.args.documentId === docIdBigInt ||
              decoded.args.newDocumentId === docIdBigInt ||
              decoded.args.previousDocumentId === docIdBigInt)
          ) {
            docLogs.push({ log, decoded });
          }
        } catch {
          // Log not part of DocumentVerificationABI, skip
        }
      }

      // Fetch block timestamps for on-chain logs
      const blockTimestamps = {};
      await Promise.all(
        docLogs.map(async ({ log }) => {
          if (!blockTimestamps[log.blockNumber.toString()]) {
            try {
              const block = await publicClient.getBlock({ blockNumber: log.blockNumber });
              blockTimestamps[log.blockNumber.toString()] = Number(block.timestamp) * 1000;
            } catch {
              blockTimestamps[log.blockNumber.toString()] = Date.now();
            }
          }
        })
      );

      for (const { log, decoded } of docLogs) {
        const ts = blockTimestamps[log.blockNumber.toString()] || Date.now();
        const formatted = formatContractEvent(
          decoded.eventName,
          decoded.args,
          log.transactionHash,
          log.blockNumber,
          new Date(ts).toISOString()
        );
        timeline.push(formatted);
      }
    } catch (err) {
      console.warn("Could not retrieve on-chain logs:", err.message || err);
    }
  }

  // 3. Integrate backend audit events (such as SHA-256 fingerprinting, proxy fetches, reviewer decisions)
  for (const be of backendEvents) {
    // Avoid exact duplicate events if already represented by on-chain logs
    const isDuplicate = timeline.some(
      (t) => t.txHash && be.txHash && t.txHash.toLowerCase() === be.txHash.toLowerCase()
    );
    if (!isDuplicate) {
      timeline.push({
        type: "OFF_CHAIN",
        title: be.eventType.replace(/_/g, " "),
        description: be.details || "Action recorded by backend service.",
        actor: be.actor,
        role: "System / Service",
        badge: be.eventType === "EVIDENCE_UPLOADED" ? "File Ingested" : "Audit Record",
        badgeColor: "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60",
        txHash: be.txHash || null,
        blockNumber: null,
        timestamp: be.timestamp,
      });
    }
  }

  // 4. Sort timeline chronologically (earliest to latest)
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    metadata,
    decisions,
    timeline,
  };
}
