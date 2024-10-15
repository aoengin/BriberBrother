// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.27;

contract BriberBrothers {

    event AddressIndexed(address indexed evmAddress, uint64 index);

    uint64 index = 1;
    mapping (uint64 => address) idToAddress;
    mapping (address => uint64) addressToId;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function indexer(address evmAddress) public returns (uint64) {
        require(addressToId[evmAddress] == 0, "Address already indexed");
        require(evmAddress != address(0), "Cannot index the zero address");
        idToAddress[index] = evmAddress; 
        addressToId[evmAddress] = index;
        emit AddressIndexed(evmAddress, index);
        index++;
        return (addressToId[evmAddress]);
    }

    function getIndexByAddress(address evmAddress) public view returns (uint64) {
        require(addressToId[evmAddress] != 0, "Address not indexed");
        return addressToId[evmAddress];
    }

}