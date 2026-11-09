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
 * Uploads a File to the Evidence Chain backend -> Pinata IPFS.
 * Returns { success, ipfsHash, fileName, fileSize, mimeType } on success.
 * Throws an Error with a descriptive message on failure.
 *
 * @param {File} file
 * @returns {Promise<{ success: boolean, ipfsHash: string, fileName: string, fileSize: number, mimeType: string }>}
 */
export async function uploadEvidence(file) {
  const formData = new FormData();
  formData.append("file", file);

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
