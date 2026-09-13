// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EmtSepoliaRegistry is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    constructor() ERC721("EMT Credential Registry", "EMT") Ownable(msg.sender) {}

    /**
     * @notice Issue an EMT license/credential to an authorized wallet address.
     */
    function issueLicense(address emtAddress) external onlyOwner {
        _tokenIdCounter++;
        _safeMint(emtAddress, _tokenIdCounter);
    }

    /**
     * @notice Revoke/Burn an EMT credential if an EMT loses authorization.
     */
    function revokeLicense(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }
}