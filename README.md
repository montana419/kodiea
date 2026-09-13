# ZK-Medical-Triage

A dual-chain, zero-knowledge medical triage system designed to provide emergency medical technicians (EMTs) rapid access to critical patient data during pre-hospital care, while maintaining cryptographically guaranteed privacy and immutable audit logging.

---

## 🛠️ System Architecture

* **Ethereum Sepolia:** Serves as the identity registry layer to verify EMT credentials and authority (`SEPOLIA_REGISTRY_ADDRESS`).
* **Creditcoin CC3 Testnet:** Acts as the low-cost execution layer for logging access proofs and attestation receipts via smart contract 
* **IPFS / Pinata:** Decouples raw record storage from the chain, pinning encrypted or zero-knowledge payload metadata off-chain.
* **ZK Consent Verification:** Generates zero-knowledge receipts (Attestcoin) validating patient consent and allergy flags without exposing sensitive medical history.

---

## ⚡ Quick Start

### 1. Prerequisites

* Node.js v18+
* npm / yarn

