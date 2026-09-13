import { ethers } from "ethers";

export async function generateZKConsentProof(emtAddress, ipfsCid) {
  const dummyProof = {
    pi_a: ["0x23a", "0x11b"],
    pi_b: [["0x44c", "0x55d"], ["0x66e", "0x77f"]],
    pi_c: ["0x88a", "0x99b"]
  };

  const zkProofHash = ethers.keccak256(
    ethers.toUtf8Bytes(JSON.stringify(dummyProof) + emtAddress + ipfsCid)
  );

  return { proof: dummyProof, zkProofHash };
}