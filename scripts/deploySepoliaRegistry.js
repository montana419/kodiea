const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const solc = require("solc");
require("dotenv").config();

// Custom import resolver for OpenZeppelin files in node_modules
function findImports(importPath) {
  try {
    let resolvedPath;
    if (importPath.startsWith("@openzeppelin/")) {
      resolvedPath = path.resolve(__dirname, "../node_modules", importPath);
    } else {
      resolvedPath = path.resolve(__dirname, "../contracts", importPath);
    }

    if (fs.existsSync(resolvedPath)) {
      return { contents: fs.readFileSync(resolvedPath, "utf8") };
    }
    return { error: `File not found: ${importPath}` };
  } catch (e) {
    return { error: e.message };
  }
}

async function main() {
  console.log("Connecting to Ethereum Sepolia RPC...");

  const rpcUrl = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
  const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: 11155111, name: "sepolia" });

  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY in your .env file.");
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(`Deploying from account: ${wallet.address}`);

  const contractPath = path.join(__dirname, "../contracts/EmtSepoliaRegistry.sol");
  const source = fs.readFileSync(contractPath, "utf8");

  const input = {
    language: "Solidity",
    sources: { "EmtSepoliaRegistry.sol": { content: source } },
    settings: {
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode"] }
      }
    }
  };

  console.log("Compiling EmtSepoliaRegistry.sol...");
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  if (output.errors) {
    const errors = output.errors.filter((e) => e.severity === "error");
    if (errors.length > 0) {
      console.error("Compilation errors:", errors);
      process.exit(1);
    }
  }

  const contractData = output.contracts["EmtSepoliaRegistry.sol"]["EmtSepoliaRegistry"];
  const factory = new ethers.ContractFactory(contractData.abi, contractData.evm.bytecode.object, wallet);

  console.log("Deploying contract to Sepolia testnet...");
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();

  console.log("\n==================================================");
  console.log(`✅ SUCCESS: EmtSepoliaRegistry Deployed!`);
  console.log(`📍 Sepolia Registry Address: ${deployedAddress}`);
  console.log("==================================================\n");
  console.log("Add this to your .env file:");
  console.log(`SEPOLIA_REGISTRY_ADDRESS=${deployedAddress}`);
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});