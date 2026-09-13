const { ethers } = require("ethers");
const fs = require("fs");
const solc = require("solc");
require("dotenv").config();

async function main() {
  console.log("Compiling CreditcoinMedicalAttestation.sol directly...");

  const source = fs.readFileSync("contracts/CreditcoinMedicalAttestation.sol", "utf8");

  const input = {
    language: "Solidity",
    sources: {
      "CreditcoinMedicalAttestation.sol": { content: source }
    },
    settings: {
      evmVersion: "cancun",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode"]
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contractData = output.contracts["CreditcoinMedicalAttestation.sol"]["CreditcoinMedicalAttestation"];

  const abi = contractData.abi;
  const bytecode = contractData.evm.bytecode.object;

  const provider = new ethers.JsonRpcProvider(process.env.CREDITCOIN_TESTNET_RPC || "https://rpc.cc3-testnet.creditcoin.network");
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  console.log(`Deploying from address: ${wallet.address}`);

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log(`✅ Creditcoin Contract Deployed at Address: ${deployedAddress}`);
}

main().catch((err) => {
  console.error("❌ Direct deployment failed:", err);
  process.exit(1);
});