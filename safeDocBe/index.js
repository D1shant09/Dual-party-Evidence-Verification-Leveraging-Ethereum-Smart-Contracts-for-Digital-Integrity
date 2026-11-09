const fs = require("fs");
const path = require("path");

// Gracefully load .env from safeDocBe/ or current working directory (Node 20.6+)
const possibleEnvPaths = [
  path.join(__dirname, ".env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "safeDocBe", ".env"),
];

for (const envPath of possibleEnvPaths) {
  try {
    if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
      process.loadEnvFile(envPath);
      break;
    }
  } catch {
    // Continue to next path
  }
}

const express = require("express");
const multer = require("multer");
const { PinataSDK } = require("pinata-web3");
const { File } = require("buffer");

const app = express();
const port = process.env.PORT || 30123;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed origins for CORS (Vite development server)
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

// CORS middleware allowing frontend
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Non-browser or same-origin requests
    res.header("Access-Control-Allow-Origin", "http://localhost:5173");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

// Allowed MIME types for digital evidence (documents, images, audio, video, reports)
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska"
]);

// Configure Multer for file uploads with 100MB limit
const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 100 * 1024 * 1024 }
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
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file was uploaded." });
  }

  const uploadedFile = req.file;
  const filePath = uploadedFile.path;

  try {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(uploadedFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `File type "${uploadedFile.mimetype}" is not permitted. Allowed types include PDF, Word documents, text, images, audio, and video.`
      });
    }

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
      ipfsHash: uploadResponse.IpfsHash,
      fileName: uploadedFile.originalname,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimetype
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

    // Pinata SDK returns a Web Blob; convert to Node Buffer for Express binary streaming
    if (fileResponse.data && typeof fileResponse.data.arrayBuffer === "function") {
      const arrayBuffer = await fileResponse.data.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } else if (typeof fileResponse.data === "string" || Buffer.isBuffer(fileResponse.data)) {
      res.send(fileResponse.data);
    } else {
      res.send(fileResponse.data);
    }
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
