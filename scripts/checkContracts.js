import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

async function verifyContracts() {
  const sepoliaRpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const creditcoinRpc = process.env.CREDITCOIN_TESTNET_RPC || "https://rpc.cc3-testnet.creditcoin.network";

  const sepoliaAddress = process.env.SEPOLIA_REGISTRY_ADDRESS;
  const creditcoinAddress = process.env.CREDITCOIN_CONTRACT_ADDRESS;

  console.log("--- Contract On-Chain Verification ---\n");

  if (sepoliaAddress) {
    try {
      const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpc);
      const sepoliaCode = await sepoliaProvider.getCode(sepoliaAddress);
      
      if (sepoliaCode !== "0x" && sepoliaCode !== "0x0") {
        console.log(`✅ Sepolia Contract IS LIVE at: ${sepoliaAddress}`);
      } else {
        console.log(`❌ Sepolia Address (${sepoliaAddress}) has NO bytecode!`);
      }
    } catch (err) {
      console.error(`❌ Sepolia Check Failed: ${err.message}`);
    }
  }

  if (creditcoinAddress) {
    try {
      const creditcoinProvider = new ethers.JsonRpcProvider(creditcoinRpc);
      const creditcoinCode = await creditcoinProvider.getCode(creditcoinAddress);

      if (creditcoinCode !== "0x" && creditcoinCode !== "0x0") {
        console.log(`✅ Creditcoin Contract IS LIVE at: ${creditcoinAddress}`);
      } else {
        console.log(`❌ Creditcoin Address (${creditcoinAddress}) has NO bytecode!`);
      }
    } catch (err) {
      console.error(`❌ Creditcoin Check Failed: ${err.message}`);
    }
  }
}

verifyContracts();