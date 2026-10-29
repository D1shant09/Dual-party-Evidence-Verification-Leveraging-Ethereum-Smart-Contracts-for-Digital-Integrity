// Gracefully load .env if present (Node 20.6+)
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile();
  }
} catch {
  // .env is optional; continue without error
}

const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { PinataSDK } = require("pinata-web3");
const { File } = require("buffer");

const app = express();
const port = process.env.PORT || 30123;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// CORS middleware allowing frontend (e.g. Vite on localhost:5173)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Configure Multer for file uploads with 10MB limit
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Initialize Pinata SDK
if (!process.env.PINATA_JWT) {
  console.warn("Notice: PINATA_JWT is not set. IPFS uploads to Pinata will fail until safeDocBe/.env is configured.");
}

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || "",
  pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud"
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    pinataConfigured: Boolean(process.env.PINATA_JWT)
  });
});

// Upload file to Pinata IPFS
app.post("/upload", upload.any(), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: "No file was uploaded." });
  }

  const uploadedFile = req.files[0];
  const filePath = uploadedFile.path;

  try {
    if (!process.env.PINATA_JWT) {
      return res.status(503).json({
        success: false,
        message: "IPFS uploads are disabled: PINATA_JWT is not configured in safeDocBe/.env."
      });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    const file = new File([blob], uploadedFile.originalname, { type: uploadedFile.mimetype });

    const uploadResponse = await pinata.upload.file(file);

    res.json({
      success: true,
      ipfsHash: uploadResponse.IpfsHash
    });
  } catch (error) {
    console.error("Upload error:", error.message || error);
    res.status(500).json({ success: false, message: "Upload failed: " + (error.message || "Unknown error") });
  } finally {
    // Always clean up uploaded temporary file to prevent disk exhaustion
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupErr) {
        console.error("Failed to delete temp file:", cleanupErr);
      }
    }
  }
});

// Retrieve file from Pinata
app.get("/get/:cid", async (req, res) => {
  const cid = req.params.cid;

  // Validate CID format: base58 (Qm...) or base32 (bafy...)
  if (!cid || !/^[a-zA-Z0-9]{40,70}$/.test(cid)) {
    return res.status(400).json({ success: false, message: "Invalid CID format." });
  }

  try {
    const fileResponse = await pinata.gateways.get(cid);
    if (fileResponse.contentType) {
      res.setHeader("Content-Type", fileResponse.contentType);
    }
    res.send(fileResponse.data);
  } catch (error) {
    console.error("Retrieval error:", error.message || error);
    res.status(500).json({ success: false, message: "Retrieval failed." });
  }
});

// Start Express server
const server = app.listen(port, () => {
  console.log(`DocSafe Backend running on http://localhost:${port}`);
});

module.exports = { app, server };
