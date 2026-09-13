const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * 1. Define Patient Metadata & IPFS Pointer
 * This is the exact payload structure encoded into the 2D QR Code.
 */
const patientPayload = {
  version: "1.0",
  ipfsCid: "ipfs://bafybeicg123456789", // Pointer to encrypted health record
  proxy: "https://proxy.health-node.io/api/v1", // Automated Patient Cloud Proxy
  patientHash: "0x8f2d...93a1" // Obfuscated identifier
};

// Convert payload to JSON string
const qrDataString = JSON.stringify(patientPayload);

// Output image path
const outputPath = path.join(__dirname, '../patient_wristband_qr.png');

/**
 * 2. Generate PNG QR Code Barcode File
 */
async function generatePatientWristbandQR() {
  try {
    console.log("==========================================");
    console.log("Generating Medical ID Barcode...");
    console.log("Payload String:", qrDataString);
    console.log("==========================================");

    // Save as high-resolution PNG file for printing
    await QRCode.toFile(outputPath, qrDataString, {
      color: {
        dark: '#000000',  // Black QR Modules
        light: '#FFFFFF'  // White Background
      },
      errorCorrectionLevel: 'H', // High error correction (works even if wristband is scratched/wet)
      margin: 2,
      width: 500 // Image width in pixels
    });

    console.log(`✅ Success! Barcode saved to: ${outputPath}`);
    
    // Also output base64 data URI (useful for web display)
    const dataUrl = await QRCode.toDataURL(qrDataString);
    console.log("\nData URL (for embedding in web apps/HTML):");
    console.log(dataUrl.substring(0, 80) + "...[truncated]");

  } catch (err) {
    console.error("❌ Error generating barcode:", err);
  }
}

generatePatientWristbandQR();