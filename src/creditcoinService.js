import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

export async function logToCreditcoinTestnet(requestId, patientIdHash, zkProofHash, isEmtAuthorized) {
  try {
    const rpcUrl = process.env.CREDITCOIN_TESTNET_RPC || "https://rpc.cc3-testnet.creditcoin.network";
    const privateKey = process.env.PRIVATE_KEY;
    const contractAddress = process.env.CREDITCOIN_CONTRACT_ADDRESS;

    if (!privateKey || !contractAddress) {
      throw new Error("Missing CREDITCOIN_CONTRACT_ADDRESS or PRIVATE_KEY in .env");
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Matches your CreditcoinMedicalAttestation.sol interface exactly
    const abi = [
      "function logAccess(bytes32 requestId, bytes32 patientIdHash, bytes32 zkProofHash, bool verifiedViaSepolia) external"
    ];

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    console.log(`[Creditcoin] Logging audit record for Request ID: ${requestId}...`);

    const tx = await contract.logAccess(
      requestId,
      patientIdHash,
      zkProofHash,
      isEmtAuthorized,
      { gasLimit: 300000 }
    );

    console.log(`[Creditcoin] Tx broadcasted: ${tx.hash}. Waiting for receipt...`);
    const receipt = await tx.wait();
    console.log(`[Creditcoin] Confirmed in block ${receipt.blockNumber}`);

    return { success: true, txHash: receipt.hash };
  } catch (err) {
    console.error("[Creditcoin Service Exception]:", err.message);
    return { success: false, txHash: `0x_failed_cc3_tx_${Date.now()}` };
  }
}