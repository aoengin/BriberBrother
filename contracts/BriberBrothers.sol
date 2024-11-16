// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.27;

import {BTCUtils} from "./BTCUtils.sol";
import {ValidateSPV} from "./ValidateSPV.sol";

contract BriberBrothers {
    // Maybe this error can be expanded with the 'Bribe' info as well.
    /// There is already a bribe for the transaction with wTXID `wTXID`.
    error TransactionAlreadyBribed(bytes32 wTXID);

    /// You are not the briber for wTXID `wTXID`. The bribe may not exist. 
    error NotTheBriber(bytes32 wTXID);

    /// The bribe is still valid, it can only be withdrawn after the timestamp `validUntil`.
    error BribeStillValid(bytes32 wTXID, uint256 validUntil);

    /// Can't place a bribe with amount equal to zero.
    error ZeroBribe();

    /// unlock_funds has already been called for the transaction `wTXID`
    error UnlockFundsCalledBefore(bytes32 wTXID);

    event AddressIndexed(address indexed evmAddress, uint64 index);

    struct CoinbaseTransactionParams {
        bytes4 version;
        bytes inputs;
        bytes outputs;
        bytes4 locktime;
        uint64 index;
    }

    struct Bribe{
        address briber;
        string ipfsHash;
        uint256 amount;
        uint256 validUntil;  // It might save gas to use an uint64 instead
    }


    uint64 index = 1;
    mapping (uint64 => address) idToAddress;
    mapping (address => uint64) addressToId;
    address public owner;
    mapping(bytes32 => Bribe) public Bribes;

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

    function bribeMe(CoinbaseTransactionParams calldata params, bytes32 _merkleRoot, bytes calldata _proof, uint256 _index) public view returns (address) {
        require(BTCUtils.validateVin(params.inputs), "Invalid input");
        require(_verifyCoinbaseTransaction(params), "Invalid coinbase transaction");
        bytes32 _txId = calculateTxId(params.version, params.inputs, params.outputs, params.locktime);
        require(_verifyCoinbaseTransactionInclusion(_txId, _merkleRoot, _proof, _index), "Invalid transaction inclusion");
        bytes memory addressIndex = getIndexFromCoinbaseTx(params.outputs, params.index);
        uint64 _addressIndex = bytesToUint64(addressIndex);
        address evmAddress = idToAddress[_addressIndex];
        require(evmAddress != address(0), "Address not indexed");
        return evmAddress;
    }


    function getIndexFromCoinbaseTx(bytes calldata outputs, uint64 _index) public pure returns (bytes memory) {
        bytes memory opreturn = BTCUtils.extractOutputAtIndex(outputs, _index);
        bytes memory addressIndex = BTCUtils.extractOpReturnData(opreturn);
        return addressIndex;
    }

    function calculateTxId(bytes4 _version, bytes memory _vin, bytes memory _vout, bytes4 _locktime) public view returns (bytes32) {
        bytes32 txId = ValidateSPV.calculateTxId(_version, _vin, _vout, _locktime);        
        return txId;
    }

    function _verifyCoinbaseTransactionInclusion(bytes32 _txId, bytes32 _merkleRoot, bytes calldata _proof, uint256 _index) public view returns (bool) {
        return ValidateSPV.prove(_txId, _merkleRoot, _proof, _index);
    }

    function _verifyCoinbaseTransaction(CoinbaseTransactionParams calldata params) private pure returns (bool) {
        bytes32 input_txId = BTCUtils.extractInputTxIdLeAt(params.inputs, 1);
        return input_txId == 0x00;
    }

    // TODO: implement a better version of this function
    function bytesToUint64(bytes memory b) public pure returns (uint64) {
        uint256 _b = BTCUtils.bytesToUint(b);
        require (_b < type(uint64).max, "Value out of bounds");
        return uint64(_b);
    }

    function isBribeEmpty(Bribe memory bribe) private pure returns (bool) {
        return bribe.briber == address(0);
    }

    function recordTx(bytes32 wTXID, string calldata ipfsHash) public payable {
        require(isBribeEmpty(Bribes[wTXID]), TransactionAlreadyBribed(wTXID));
        require(msg.value > 0, ZeroBribe());
        Bribes[wTXID] = Bribe(msg.sender, ipfsHash, msg.value, type(uint256).max);
    }

    function unlockFunds(bytes32 wTXID) public {
        Bribe storage bribe = Bribes[wTXID];
        require(msg.sender == bribe.briber, NotTheBriber(wTXID));
        require(bribe.validUntil == type(uint256).max, UnlockFundsCalledBefore(wTXID));
        bribe.validUntil = block.timestamp + 14 days;
    }

    function withdrawBribe(bytes32 wTXID, address payable recipient) public {
        Bribe memory bribe = Bribes[wTXID];
        require(msg.sender == bribe.briber, NotTheBriber(wTXID));
        require(block.timestamp > bribe.validUntil, BribeStillValid(wTXID, bribe.validUntil));

        // Do we need to check if the bribe amount is non-zero here or while recording the tx?
        uint256 bribeAmount = bribe.amount;
        delete Bribes[wTXID];
        recipient.transfer(bribeAmount);
    }

    function getBribe(bytes32 wTXID) public view returns (Bribe memory){
        return Bribes[wTXID];
    }

}