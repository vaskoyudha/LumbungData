// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title SubsidyLedger
/// @notice Immutable ledger for recording agricultural subsidy distributions
/// @dev Deployed on Hyperledger Besu private network
contract SubsidyLedger {
    address public owner;

    struct Distribution {
        address farmerId;
        string itemType;
        string itemName;
        uint256 quantity;
        string unit;
        address distributorId;
        uint256 timestamp;
    }

    mapping(address => Distribution[]) public farmerDistributions;
    mapping(address => bool) public authorizedDistributors;

    event DistributionRecorded(
        address indexed farmerId,
        address indexed distributorId,
        string itemType,
        uint256 quantity,
        uint256 timestamp
    );

    event DistributorAdded(address indexed distributor);
    event DistributorRemoved(address indexed distributor);

    error NotOwner();
    error NotAuthorized();
    error ZeroAddress();
    error ZeroQuantity();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyDistributor() {
        if (!authorizedDistributors[msg.sender]) revert NotAuthorized();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addDistributor(address distributor) external onlyOwner {
        if (distributor == address(0)) revert ZeroAddress();
        authorizedDistributors[distributor] = true;
        emit DistributorAdded(distributor);
    }

    function removeDistributor(address distributor) external onlyOwner {
        authorizedDistributors[distributor] = false;
        emit DistributorRemoved(distributor);
    }

    function recordDistribution(
        address farmerId,
        string calldata itemType,
        string calldata itemName,
        uint256 quantity,
        string calldata unit
    ) external onlyDistributor {
        if (farmerId == address(0)) revert ZeroAddress();
        if (quantity == 0) revert ZeroQuantity();

        Distribution memory dist = Distribution({
            farmerId: farmerId,
            itemType: itemType,
            itemName: itemName,
            quantity: quantity,
            unit: unit,
            distributorId: msg.sender,
            timestamp: block.timestamp
        });

        farmerDistributions[farmerId].push(dist);

        emit DistributionRecorded(
            farmerId,
            msg.sender,
            itemType,
            quantity,
            block.timestamp
        );
    }

    function getDistributions(
        address farmerId
    ) external view returns (Distribution[] memory) {
        return farmerDistributions[farmerId];
    }

    function getDistributionCount(
        address farmerId
    ) external view returns (uint256) {
        return farmerDistributions[farmerId].length;
    }
}
