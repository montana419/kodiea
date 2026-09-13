// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CreditcoinMedicalAttestation
 * @notice Deployed directly to Creditcoin EVM Testnet to log cross-chain 
 *         Attestcoin proofs and ZK consent verification receipts.
 */
contract CreditcoinMedicalAttestation {
    struct AccessReceipt {
        bytes32 requestId;
        address emtAddress;
        bytes32 patientIdHash;
        bytes32 zkProofHash;
        uint64 timestamp;
        bool verifiedViaSepolia;
    }

    mapping(bytes32 => AccessReceipt) public receipts;

    event MedicalAccessLogged(
        bytes32 indexed requestId,
        address indexed emtAddress,
        bytes32 indexed patientIdHash,
        bytes32 zkProofHash,
        uint64 timestamp,
        bool verifiedViaSepolia
    );

    /**
     * @notice Logs a verified access request to the Creditcoin ledger.
     */
    function logAccess(
        bytes32 requestId,
        bytes32 patientIdHash,
        bytes32 zkProofHash,
        bool verifiedViaSepolia
    ) external {
        require(receipts[requestId].timestamp == 0, "Request already logged");

        receipts[requestId] = AccessReceipt({
            requestId: requestId,
            emtAddress: msg.sender,
            patientIdHash: patientIdHash,
            zkProofHash: zkProofHash,
            timestamp: uint64(block.timestamp),
            verifiedViaSepolia: verifiedViaSepolia
        });

        emit MedicalAccessLogged(
            requestId,
            msg.sender,
            patientIdHash,
            zkProofHash,
            uint64(block.timestamp),
            verifiedViaSepolia
        );
    }

    function getReceipt(bytes32 requestId) external view returns (AccessReceipt memory) {
        return receipts[requestId];
    }
}