const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "docsafe.db");
const db = new DatabaseSync(dbPath);

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS evidence_metadata (
    evidenceId TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    recipient TEXT NOT NULL,
    title TEXT,
    category TEXT,
    caseNumber TEXT,
    description TEXT,
    ipfsCid TEXT,
    sha256Hash TEXT,
    fileName TEXT,
    fileSize INTEGER,
    mimeType TEXT,
    version INTEGER DEFAULT 1,
    previousDocId TEXT,
    status TEXT DEFAULT 'AwaitingRecipientAuthorization',
    rejectionReason TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reviewer_decisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidenceId TEXT NOT NULL,
    reviewerAddress TEXT NOT NULL,
    role TEXT NOT NULL,
    decision TEXT NOT NULL,
    reason TEXT,
    txHash TEXT,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evidenceId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    actor TEXT NOT NULL,
    details TEXT,
    txHash TEXT,
    timestamp TEXT NOT NULL
  );
`);

/**
 * Upsert evidence metadata
 */
function saveEvidenceMetadata(record) {
  const existing = getEvidenceMetadata(record.evidenceId);
  const now = new Date().toISOString();

  if (existing) {
    const stmt = db.prepare(`
      UPDATE evidence_metadata SET
        provider = COALESCE(?, provider),
        recipient = COALESCE(?, recipient),
        title = COALESCE(?, title),
        category = COALESCE(?, category),
        caseNumber = COALESCE(?, caseNumber),
        description = COALESCE(?, description),
        ipfsCid = COALESCE(?, ipfsCid),
        sha256Hash = COALESCE(?, sha256Hash),
        fileName = COALESCE(?, fileName),
        fileSize = COALESCE(?, fileSize),
        mimeType = COALESCE(?, mimeType),
        version = COALESCE(?, version),
        previousDocId = COALESCE(?, previousDocId),
        status = COALESCE(?, status),
        rejectionReason = COALESCE(?, rejectionReason),
        updatedAt = ?
      WHERE evidenceId = ?
    `);

    stmt.run(
      record.provider || null,
      record.recipient || null,
      record.title || null,
      record.category || null,
      record.caseNumber || null,
      record.description || null,
      record.ipfsCid || null,
      record.sha256Hash || null,
      record.fileName || null,
      record.fileSize || null,
      record.mimeType || null,
      record.version || null,
      record.previousDocId || null,
      record.status || null,
      record.rejectionReason || null,
      now,
      String(record.evidenceId)
    );
  } else {
    const stmt = db.prepare(`
      INSERT INTO evidence_metadata (
        evidenceId, provider, recipient, title, category, caseNumber, description,
        ipfsCid, sha256Hash, fileName, fileSize, mimeType, version, previousDocId,
        status, rejectionReason, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      String(record.evidenceId),
      record.provider || "",
      record.recipient || "",
      record.title || "Untitled Evidence",
      record.category || "General Evidence",
      record.caseNumber || "",
      record.description || "",
      record.ipfsCid || "",
      record.sha256Hash || "",
      record.fileName || "",
      record.fileSize || 0,
      record.mimeType || "",
      record.version || 1,
      record.previousDocId || null,
      record.status || "AwaitingRecipientAuthorization",
      record.rejectionReason || null,
      now,
      now
    );
  }

  return getEvidenceMetadata(record.evidenceId);
}

function getEvidenceMetadata(evidenceId) {
  const stmt = db.prepare(`SELECT * FROM evidence_metadata WHERE evidenceId = ?`);
  return stmt.get(String(evidenceId)) || null;
}

function getAllEvidenceMetadata() {
  const stmt = db.prepare(`SELECT * FROM evidence_metadata ORDER BY CAST(evidenceId AS INTEGER) DESC`);
  return stmt.all();
}

function saveReviewerDecision({ evidenceId, reviewerAddress, role, decision, reason, txHash }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO reviewer_decisions (evidenceId, reviewerAddress, role, decision, reason, txHash, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(String(evidenceId), reviewerAddress, role, decision, reason || null, txHash || null, now);
}

function getReviewerDecisions(evidenceId) {
  const stmt = db.prepare(`SELECT * FROM reviewer_decisions WHERE evidenceId = ? ORDER BY id ASC`);
  return stmt.all(String(evidenceId));
}

function logAuditEvent({ evidenceId, eventType, actor, details, txHash }) {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO audit_events (evidenceId, eventType, actor, details, txHash, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(String(evidenceId), eventType, actor || "System", details || null, txHash || null, now);
}

function getAuditEvents(evidenceId) {
  const stmt = db.prepare(`SELECT * FROM audit_events WHERE evidenceId = ? ORDER BY id ASC`);
  return stmt.all(String(evidenceId));
}

module.exports = {
  db,
  saveEvidenceMetadata,
  getEvidenceMetadata,
  getAllEvidenceMetadata,
  saveReviewerDecision,
  getReviewerDecisions,
  logAuditEvent,
  getAuditEvents,
};
