// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.27;

import {BTCUtils} from "../external/BTCUtils.sol";
import {ValidateSPV} from "../external/ValidateSPV.sol";

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

    address constant CitreaBitcoinLightClient = 0x3100000000000000000000000000000000000001;


    event AddressIndexed(address indexed evmAddress, uint64 index);

    event BribePlaced(bytes32 wTXID, uint256 bribeAmount, string ipfsHash);

    event BribeWithdrawn(bytes32 wTXID);

    struct CoinbaseTransactionParams {
        bytes4 version;
        bytes inputs;
        bytes outputs;
        bytes4 locktime;
        uint64 index;
    }

    struct CoinbaseTransaction {
        CoinbaseTransactionParams coinbaseTxParams;
        bytes proof;
        uint256 index;
    }

    struct BribedTx {
        bytes32 wTXID;
        bytes proof;
        uint64 index;
    }

    struct Bribe{
        address briber;
        string ipfsHash;
        uint256 amount;
        uint256 validUntil;  // It might save gas to use an uint64 instead
    }

    struct BlockHeader {
        bytes4 version;
        bytes32 prevBlock;
        bytes32 merkleRoot;
        bytes4 time;
        bytes4 bits;
        bytes4 nonce;
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

    function bribeMe(CoinbaseTransaction calldata coinbaseTx, BlockHeader calldata blockheaderParams, BribedTx calldata bribedTx, uint256 blockHeight) public {
        require(bribedTx.wTXID != bytes32(0), "Bribed transcation wTXID cannot be zero");
        require(_calculateAndCompareHash(blockheaderParams, blockHeight), "Invalid block header");
        require(BTCUtils.validateVin(coinbaseTx.coinbaseTxParams.inputs), "Invalid input");
        require(_verifyCoinbaseTransaction(coinbaseTx.coinbaseTxParams), "Invalid coinbase transaction");
        bytes32 _txId = _calculateTxId(coinbaseTx.coinbaseTxParams.version, coinbaseTx.coinbaseTxParams.inputs, coinbaseTx.coinbaseTxParams.outputs, coinbaseTx.coinbaseTxParams.locktime);
        require(_verifyCoinbaseTransactionInclusion(_txId, blockheaderParams.merkleRoot, coinbaseTx.proof, coinbaseTx.index), "Invalid coinbase transaction inclusion");
        require(Bribes[bribedTx.wTXID].briber != address(0), "Transaction not bribed");
        require(_callVerifyInclusion(blockHeight, bribedTx.wTXID, bribedTx.proof, bribedTx.index), "Invalid transaction inclusion");
        bytes memory addressIndex = _getIndexFromCoinbaseTx(coinbaseTx.coinbaseTxParams.outputs, coinbaseTx.coinbaseTxParams.index);
        uint64 _addressIndex = _bytesToUint64(addressIndex);
        address evmAddress = idToAddress[_addressIndex];
        require(evmAddress != address(0), "Address not indexed");

        uint256 bribeAmount = Bribes[bribedTx.wTXID].amount;
        require(address(this).balance >= bribeAmount, "Contract doesn't have enough funds for this Bribe!");
        delete Bribes[bribedTx.wTXID];
        (bool success, ) = payable(evmAddress).call{value: bribeAmount}("");  // Send the bribe to the miner
        require(success, "Bribe payment failed");
    }
    
    function _callGetBlockHash(uint256 blockNumber) private view returns (bytes32) {
        (bool success, bytes memory data) = CitreaBitcoinLightClient.staticcall(
            abi.encodeWithSignature("getBlockHash(uint256)", blockNumber)
        );
        require(success, "Call to getBlockHash failed");

        return abi.decode(data, (bytes32));
    }


    function _calculateAndCompareHash(BlockHeader memory header, uint256 blockHeight)
        private
        view
        returns (bool)
    {
        bytes32 blockHash = _callGetBlockHash(blockHeight);
        require(blockHash != 0, "Block hash not found");
        
        // Concatenate block header components
        bytes memory blockHeader = abi.encodePacked(
            header.version,
            header.prevBlock,
            header.merkleRoot,
            header.time,
            header.bits,
            header.nonce
        );

        // Calculate double SHA-256 hash
        bytes32 calculatedHash = BTCUtils.hash256(blockHeader);

        // Compare the calculated hash with the existing hash
        return calculatedHash == blockHash;
    }



    function _getIndexFromCoinbaseTx(bytes calldata outputs, uint64 _index) private pure returns (bytes memory) {
        bytes memory opreturn = BTCUtils.extractOutputAtIndex(outputs, _index);
        bytes memory addressIndex = BTCUtils.extractOpReturnData(opreturn);
        return addressIndex;
    }

    function _calculateTxId(bytes4 _version, bytes memory _vin, bytes memory _vout, bytes4 _locktime) private view returns (bytes32) {
        bytes32 txId = ValidateSPV.calculateTxId(_version, _vin, _vout, _locktime);        
        return txId;
    }

    function _verifyCoinbaseTransactionInclusion(bytes32 _txId, bytes32 _merkleRoot, bytes calldata _proof, uint256 _index) public view returns (bool) {
        return ValidateSPV.prove(_txId, _merkleRoot, _proof, _index);
    }

    function _callVerifyInclusion(
        uint256 _blockNumber,
        bytes32 _wtxId,
        bytes calldata _proof,
        uint256 _index
    ) public view returns (bool) {
        bytes memory data = abi.encodeWithSignature(
            "verifyInclusion(uint256,bytes32,bytes,uint256)",
            _blockNumber,
            _wtxId,
            _proof,
            _index
        );
        (bool success, bytes memory result) = CitreaBitcoinLightClient.staticcall(data);
        if (success) {
            return abi.decode(result, (bool));
        } else {
            return false;
        }
    }

    function _verifyCoinbaseTransaction(CoinbaseTransactionParams calldata params) private pure returns (bool) {
        bytes32 input_txId = BTCUtils.extractInputTxIdLeAt(params.inputs, 1);
        return input_txId == 0x00;
    }

    // TODO: implement a better version of this function
    function _bytesToUint64(bytes memory b) private pure returns (uint64) {
        uint256 _b = BTCUtils.bytesToUint(b);
        require (_b < type(uint64).max, "Value out of bounds");
        return uint64(_b);
    }

    function _isBribeEmpty(Bribe memory bribe) private pure returns (bool) {
        return bribe.briber == address(0);
    }

    function recordTx(bytes32 wTXID, string calldata ipfsHash) public payable {
        require(wTXID != 0, "wTXID can't be zero!");
        require(_isBribeEmpty(Bribes[wTXID]), TransactionAlreadyBribed(wTXID));
        require(msg.value > 0, ZeroBribe());
        Bribes[wTXID] = Bribe(msg.sender, ipfsHash, msg.value, type(uint256).max);
        emit BribePlaced(wTXID, msg.value, ipfsHash);
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
        emit BribeWithdrawn(wTXID);
        recipient.transfer(bribeAmount);
    }

    function getBribe(bytes32 wTXID) public view returns (Bribe memory){
        return Bribes[wTXID];
    }

}
