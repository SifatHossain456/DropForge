// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/// @title MerkleDistributor — gas-efficient ERC-20 airdrop via Merkle proofs
contract MerkleDistributor {
    address public immutable token;
    bytes32 public immutable merkleRoot;
    address public immutable owner;
    uint256 public claimedCount;

    // Packed bitmap: 1 bit per index (256 indices per slot)
    mapping(uint256 => uint256) private _claimedBits;

    event Claimed(uint256 indexed index, address indexed account, uint256 amount);

    constructor(address _token, bytes32 _merkleRoot) {
        token      = _token;
        merkleRoot = _merkleRoot;
        owner      = msg.sender;
    }

    /// @notice Check if a given index has already claimed
    function isClaimed(uint256 index) public view returns (bool) {
        uint256 word = _claimedBits[index >> 8];
        uint256 bit  = 1 << (index & 0xff);
        return word & bit == bit;
    }

    /// @notice Claim tokens for `account` at `index` using a Merkle `proof`
    function claim(
        uint256        index,
        address        account,
        uint256        amount,
        bytes32[] calldata proof
    ) external {
        require(!isClaimed(index), "Already claimed");

        // Rebuild leaf hash — must match frontend
        bytes32 leaf = keccak256(abi.encodePacked(index, account, amount));
        require(_verify(proof, merkleRoot, leaf), "Invalid proof");

        // Mark claimed
        _claimedBits[index >> 8] |= 1 << (index & 0xff);
        claimedCount++;

        require(IERC20(token).transfer(account, amount), "Transfer failed");
        emit Claimed(index, account, amount);
    }

    /// @notice Owner can recover unclaimed tokens after airdrop ends
    function withdraw() external {
        require(msg.sender == owner, "Not owner");
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(IERC20(token).transfer(owner, bal), "Transfer failed");
    }

    function _verify(
        bytes32[] calldata proof,
        bytes32 root,
        bytes32 leaf
    ) private pure returns (bool) {
        bytes32 hash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            // Sort pair — matches frontend's sorted Merkle tree
            hash = hash <= p
                ? keccak256(abi.encodePacked(hash, p))
                : keccak256(abi.encodePacked(p, hash));
        }
        return hash == root;
    }
}
