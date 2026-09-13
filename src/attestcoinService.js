import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

export async function verifySepoliaCredential(emtAddress) {
  try {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
    const registryAddress = process.env.SEPOLIA_REGISTRY_ADDRESS;

    if (!registryAddress) {
      console.error("[Attestcoin Service Error]: SEPOLIA_REGISTRY_ADDRESS is missing in .env");
      return false;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Standard ABI checking both balanceOf / holdsLicense methods
    const abi = [
      "function balanceOf(address owner) view returns (uint256)",
      "function hasLicense(address emtAddress) view returns (bool)",
      "function isEMT(address emtAddress) view returns (bool)"
    ];

    const contract = new ethers.Contract(registryAddress, abi, provider);

    // Try balanceOf check (if ERC-721 credential token)
    try {
      const balance = await contract.balanceOf(emtAddress);
      if (balance > 0n) return true;
    } catch (e) {
      // Fall through to other checks if balanceOf is not supported
    }

    // Try boolean checks if defined
    try {
      const hasLic = await contract.hasLicense(emtAddress);
      if (hasLic) return true;
    } catch (e) {}

    try {
      const isEmt = await contract.isEMT(emtAddress);
      if (isEmt) return true;
    } catch (e) {}

    return false;
  } catch (err) {
    console.error("[Attestcoin Service Exception]:", err.message);
    return false;
  }
}