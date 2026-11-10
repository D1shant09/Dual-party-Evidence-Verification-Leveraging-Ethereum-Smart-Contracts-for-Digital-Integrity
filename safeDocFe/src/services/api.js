const BACKEND_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "http://localhost:30123";

/**
 * Computes the SHA-256 hash of a File or Blob object using the Web Crypto API.
 * Returns the hash as a lowercase hex string.
 *
 * @param {Blob | File} file
 * @returns {Promise<string>}
 */
export async function calculateSHA256(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Initiates an evidence record in the backend metadata database.
 */
export async function initiateEvidenceMetadata(payload) {
  const response = await fetch(`${BACKEND_URL}/api/evidence/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to initiate evidence metadata");
  }
  return data.record;
}

/**
 * Fetches evidence metadata, decisions, and audit events from the backend.
 */
export async function fetchEvidenceMetadata(evidenceId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/evidence/${evidenceId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (err) {
    console.error("Failed to fetch evidence metadata:", err);
    return null;
  }
}

/**
 * Records a reviewer decision (Approved / Rejected / Flagged) in the backend.
 */
export async function recordReviewerDecision(evidenceId, payload) {
  const response = await fetch(`${BACKEND_URL}/api/evidence/${evidenceId}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to record reviewer decision");
  }
  return data;
}

/**
 * Fetches the audit trail for a specific evidence item.
 */
export async function fetchAuditEvents(evidenceId) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/evidence/${evidenceId}/audit`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.auditEvents || [];
  } catch (err) {
    console.error("Failed to fetch audit events:", err);
    return [];
  }
}

/**
 * Uploads a File to the Evidence Chain backend -> Pinata IPFS, optionally linking to evidenceId.
 */
export async function uploadEvidence(file, evidenceId = null, provider = null) {
  const formData = new FormData();
  formData.append("file", file);
  if (evidenceId) formData.append("evidenceId", evidenceId);
  if (provider) formData.append("provider", provider);

  const response = await fetch(`${BACKEND_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.message || `Upload failed (HTTP ${response.status})`);
  }
  return data;
}

/**
 * Fetches evidence from IPFS via the backend gateway and verifies its SHA-256 fingerprint.
 */
export async function fetchEvidenceWithVerification(cid, expectedSha256 = null) {
  const { blob, contentType } = await fetchEvidence(cid);
  const calculatedHash = await calculateSHA256(blob);
  const isVerified = expectedSha256
    ? calculatedHash.toLowerCase() === expectedSha256.toLowerCase()
    : true;
  return {
    blob,
    contentType,
    sha256: calculatedHash,
    isVerified,
  };
}

/**
 * Fetches a file from IPFS via the backend gateway.
 * Returns a Blob and content type so the caller can preview or download.
 *
 * @param {string} cid
 * @returns {Promise<{ blob: Blob, contentType: string }>}
 */
export async function fetchEvidence(cid) {
  const response = await fetch(`${BACKEND_URL}/get/${encodeURIComponent(cid)}`);
  if (!response.ok) {
    throw new Error(`Failed to retrieve evidence (HTTP ${response.status})`);
  }
  const contentType = response.headers.get("content-type") || "application/octet-stream";
  const blob = await response.blob();
  return { blob, contentType };
}

/**
 * Checks backend health and Pinata configuration status.
 *
 * @returns {Promise<{ status: string, pinataConfigured: boolean }>}
 */
export async function checkBackendHealth() {
  const response = await fetch(`${BACKEND_URL}/health`);
  if (!response.ok) {
    throw new Error(`Backend health check failed (HTTP ${response.status})`);
  }
  return response.json();
}
