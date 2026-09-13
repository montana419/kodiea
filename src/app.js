import express from "express";
import path from "path";
import fs from "fs";
import QRCode from "qrcode";
import multer from "multer";
import * as jimpModule from "jimp";
import jsQR from "jsqr";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import { verifySepoliaCredential } from "./attestcoinService.js";
import { logToCreditcoinTestnet } from "./creditcoinService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Express Application
const app = express();
const PORT = process.env.PORT || 3000;

const Jimp = jimpModule.Jimp || jimpModule.default || jimpModule;

// 2. Setup Required Storage Directories
const uploadDir = path.join(__dirname, "../uploads");
const publicDir = path.join(__dirname, "../public");
const barcodeDir = path.join(publicDir, "barcodes");

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
if (!fs.existsSync(barcodeDir)) fs.mkdirSync(barcodeDir, { recursive: true });

const upload = multer({ dest: uploadDir });

// 3. Register Middleware BEFORE Routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

/**
 * VALIDATION REGEX PATTERNS
 */
const PATTERNS = {
  lettersHyphenDot: /^[a-zA-Z\s.-]+$/,
  bloodType: /^[a-zA-Z0-9\s.+-]+$/,
  contact: /^[0-9+() \s.-]+$/,
  medical: /^[a-zA-Z0-9,\s.-]+$/
};

/**
 * HELPER: IPFS API UTILITIES
 */
async function pinToIPFS(patientData) {
  const pinataJwt = process.env.PINATA_JWT;
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_KEY;

  let headers = { "Content-Type": "application/json" };

  if (pinataJwt && pinataJwt.trim() !== "") {
    headers["Authorization"] = `Bearer ${pinataJwt.trim()}`;
  } else if (pinataApiKey && pinataSecretKey) {
    headers["pinata_api_key"] = pinataApiKey.trim();
    headers["pinata_secret_api_key"] = pinataSecretKey.trim();
  } else {
    console.warn("⚠️ PINATA credentials missing in .env! Simulating IPFS pinning.");
    const mockHash = Buffer.from(JSON.stringify(patientData)).toString("hex").substring(0, 32);
    return `bafybeig${mockHash}`;
  }

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers,
    body: JSON.stringify({
      pinataContent: patientData,
      pinataMetadata: { name: `patient_${patientData.patientId}` }
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`IPFS Pinning Failed: ${data.error?.details || data.error || res.statusText}`);
  }
  return data.IpfsHash;
}

async function fetchFromIPFS(ipfsCid) {
  const cleanCid = ipfsCid.replace("ipfs://", "");
  
  const pinataSubdomain = process.env.PINATA_GATEWAY_URL; 
  const gateways = [
    ...(pinataSubdomain ? [`https://${pinataSubdomain}/ipfs/${cleanCid}`] : []),
    `https://ipfs.io/ipfs/${cleanCid}`,
    `https://dweb.link/ipfs/${cleanCid}`,
    `https://cloudflare-ipfs.com/ipfs/${cleanCid}`
  ];

  for (const url of gateways) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn(`Gateway ${url} failed or timed out, trying next...`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Unable to resolve IPFS CID (${cleanCid}) from configured gateways.`);
}

/**
 * HELPER: BARCODE CREATOR
 */
async function generatePatientBarcode(patientId, ipfsCid, patientHash) {
  const filename = `${patientId.toLowerCase()}.png`;
  const outputPath = path.join(barcodeDir, filename);

  const barcodePayload = {
    version: "1.0",
    patientId,
    ipfsCid: `ipfs://${ipfsCid.replace("ipfs://", "")}`,
    patientHash,
    issuedAt: new Date().toISOString()
  };

  await QRCode.toFile(outputPath, JSON.stringify(barcodePayload), {
    color: { dark: "#0f172a", light: "#ffffff" },
    errorCorrectionLevel: "H",
    margin: 2,
    width: 400
  });

  return `/barcodes/${filename}`;
}

/**
 * API ENDPOINTS
 */

// 1. Register Patient & Pin Directly to IPFS
app.post("/api/register", async (req, res) => {
  try {
    const { name, dob, bloodType, allergies, emergencyContact, medicalConditions } = req.body;

    if (!name || !dob) {
      return res.status(400).json({ success: false, error: "Name and Date of Birth are required." });
    }

    if (!PATTERNS.lettersHyphenDot.test(name)) {
      return res.status(400).json({ 
        success: false, 
        error: "Full Name can only contain letters, spaces, hyphens (-), and full stops (.)." 
      });
    }

    if (bloodType && !PATTERNS.bloodType.test(bloodType)) {
      return res.status(400).json({ 
        success: false, 
        error: "Blood Type can only contain letters, numbers, spaces, hyphens (-), plus signs (+), and full stops (.)." 
      });
    }

    if (emergencyContact && !PATTERNS.contact.test(emergencyContact)) {
      return res.status(400).json({ 
        success: false, 
        error: "Emergency Contact can only contain numbers, +, brackets (), spaces, hyphens (-), and full stops (.)." 
      });
    }

    if (medicalConditions && !PATTERNS.medical.test(medicalConditions)) {
      return res.status(400).json({ 
        success: false, 
        error: "Medical Conditions can only contain letters, numbers, commas (,), spaces, hyphens (-), and full stops (.)." 
      });
    }

    if (allergies && !PATTERNS.medical.test(allergies)) {
      return res.status(400).json({ 
        success: false, 
        error: "Allergies can only contain letters, numbers, commas (,), spaces, hyphens (-), and full stops (.)." 
      });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const cleanFirstName = name.trim().split(" ")[0].replace(/[^a-zA-Z]/g, "").toUpperCase();
    const patientId = `PATIENT-${randomSuffix}-${cleanFirstName || "USER"}`;
    const patientHash = ethers.keccak256(
      ethers.toUtf8Bytes(`${patientId}_${Date.now()}`)
    );

    const patientRecord = {
      patientId,
      name: name.trim(),
      dob,
      bloodType: bloodType ? bloodType.trim() : "Unknown",
      allergies: allergies ? allergies.split(",").map(a => a.trim()).filter(Boolean) : [],
      emergencyContact: emergencyContact ? emergencyContact.trim() : "N/A",
      medicalConditions: medicalConditions ? medicalConditions.split(",").map(m => m.trim()).filter(Boolean) : [],
      patientHash,
      createdAt: new Date().toISOString()
    };

    const rawCid = await pinToIPFS(patientRecord);
    const ipfsCid = `ipfs://${rawCid}`;
    const barcodeUrl = await generatePatientBarcode(patientId, ipfsCid, patientHash);

    return res.status(201).json({
      success: true,
      message: "Patient record pinned to IPFS successfully.",
      patient: patientRecord,
      ipfsCid,
      barcodeUrl
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Process Barcode Image & Retrieve Medical Record
app.post("/api/triage-file", upload.single("barcodeFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No barcode image file uploaded." });
  }

  try {
    const { emtAddress } = req.body;
    if (!emtAddress) {
      return res.status(400).json({ success: false, error: "EMT Wallet Address is required." });
    }

    const image = await Jimp.read(req.file.path);
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const buffer = image.bitmap.data;
    const clampedArray = new Uint8ClampedArray(buffer.buffer, buffer.byteOffset, buffer.length);

    const qrCode = jsQR(clampedArray, width, height);

    if (!qrCode || !qrCode.data) {
      return res.status(400).json({ 
        success: false, 
        error: "Could not decode QR code from image." 
      });
    }

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(qrCode.data);
    } catch (e) {
      return res.status(400).json({ success: false, error: "Invalid QR format payload." });
    }

    const ipfsCid = parsedPayload.ipfsCid;
    if (!ipfsCid) {
      return res.status(400).json({ success: false, error: "No IPFS CID found in barcode payload." });
    }

    const isEmtAuthorized = await verifySepoliaCredential(emtAddress);
    if (!isEmtAuthorized) {
      return res.status(403).json({
        success: false,
        error: "Execution Failed: EMT license invalid or unverified on Sepolia."
      });
    }

    const patientRecord = await fetchFromIPFS(ipfsCid);

    const requestId = ethers.keccak256(
      ethers.toUtf8Bytes(`${patientRecord.patientId}_${Date.now()}`)
    );
    const patientIdHash = ethers.keccak256(
      ethers.toUtf8Bytes(patientRecord.patientId || "UNKNOWN")
    );
    const zkProofHash = ethers.keccak256(
      ethers.toUtf8Bytes(`zk_proof_${ipfsCid}_${Date.now()}`)
    );

    const creditcoinTx = await logToCreditcoinTestnet(
      requestId,
      patientIdHash,
      zkProofHash,
      isEmtAuthorized
    );

    return res.status(200).json({
      success: true,
      data: {
        patient: patientRecord,
        auditTrail: {
          requestId,
          ipfsCid,
          attestcoinSepoliaStatus: "VERIFIED",
          creditcoinTxHash: creditcoinTx.txHash,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

// 3. Issue EMT License Token on Sepolia
app.post("/api/issue-license", async (req, res) => {
  try {
    const { targetAddress } = req.body;

    if (!targetAddress || !/^0x[a-fA-F0-9]{40}$/.test(targetAddress)) {
      return res.status(400).json({ 
        success: false, 
        error: "Valid Ethereum wallet address (0x...) is required." 
      });
    }

    const sepoliaRpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    const registryAddress = process.env.SEPOLIA_REGISTRY_ADDRESS;
    const privateKey = process.env.PRIVATE_KEY;

    if (!registryAddress || !privateKey) {
      return res.status(500).json({
        success: false,
        error: "Server missing SEPOLIA_REGISTRY_ADDRESS or PRIVATE_KEY configuration in .env file."
      });
    }

    const provider = new ethers.JsonRpcProvider(sepoliaRpc);
    const wallet = new ethers.Wallet(privateKey, provider);

    const registryAbi = ["function issueLicense(address emtAddress) external returns (uint256)"];
    const registryContract = new ethers.Contract(registryAddress, registryAbi, wallet);

    console.log(`[License API] Issuing EMT License token to: ${targetAddress}...`);
    const tx = await registryContract.issueLicense(targetAddress);
    const receipt = await tx.wait();

    return res.status(200).json({
      success: true,
      message: "EMT License token issued on Sepolia.",
      txHash: receipt.hash,
      targetAddress,
      blockNumber: receipt.blockNumber
    });

  } catch (err) {
    console.error("[License API Error]:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Stateless IPFS Triage Server active on port ${PORT}`);
});