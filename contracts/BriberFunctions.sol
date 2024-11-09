// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.27;

contract BriberFunctions{
  struct Bribe{
    address briber;
    string ipfsHash;
    uint256 amount;
    uint256 validUntil;  // It might save gas to use an uint64 instead
  }

  function isBribeEmpty(Bribe memory bribe) private pure returns (bool) {
    return bribe.briber == address(0) && bytes(bribe.ipfsHash).length == 0 && bribe.amount == 0 && bribe.validUntil == 0;
  }

  // Maybe this error can be expanded with the 'Bribe' info as well
  /// There is already a bribe for the transaction with wTXID `wTXID`.
  error FunctionAlreadyBribed(bytes32 wTXID);

  /// You are not the briber for wTXID `wTXID`. The bribe may not exist. 
  error NotTheBriber(bytes32 wTXID);

  /// The bribe is still valid, it can only be withdrawn after the timestamp `validUntil`.
  error BribeStillValid(bytes32 wTXID, uint256 validUntil);

  mapping(bytes32 => Bribe) public Bribes;

  function recordTx(bytes32 wTXID, string calldata ipfsHash) public payable {
    require(isBribeEmpty(Bribes[wTXID]), FunctionAlreadyBribed(wTXID));
    Bribes[wTXID] = Bribe(msg.sender, ipfsHash, msg.value, block.timestamp + 14 days);
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

}