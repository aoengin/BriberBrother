const { expect } = require("chai");
const hre = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BriberFunctions", function () {

  async function deployAndRecordTxFixture() {
    const wTXID = "0xa62d430d8dae3dfddd7d2ac12579ae36735598fd42ded7fda3b08736f6a6c696"
    const bribeAmount = 100_000_000;
    const ipfsHash = "QmQ11XQzsKvtwbnDKncRshqz7J8oEf86SzpC8DhjjWfsa9";

    const [briber, _] = await hre.ethers.getSigners();
    const contract = await hre.ethers.deployContract("BriberBrothers");
    await contract.recordTx(wTXID, ipfsHash, {value: bribeAmount})

    return {contract, wTXID, bribeAmount, ipfsHash, briber };
  }

  async function getAnotherSigner(signer) {
    const signers = await hre.ethers.getSigners();
    let other;
    if (signer.address == signers[0].address){
      other = signers[1];
    } 
    else {
      other = signers[0];
    }
    return other;
  }
  it("Should not allow wTXID to be 0 when placing a bribe", async function () {
    const wTXID = "0x0000000000000000000000000000000000000000000000000000000000000000"
    const ipfsHash = "QmQ11XQzsKvtwbnDKncRshqz7J8oEf86SzpC8DhjjWfsa9";
    const contract = await hre.ethers.deployContract("BriberBrothers");
    
    await expect(contract.recordTx(wTXID, ipfsHash, {value: 0})).to.be.revertedWith("wTXID can't be zero!");
  });

  it("Should not allow a bribe with zero amount to be placed", async function () {
    const wTXID = "0xa62d430d8dae3dfddd7d2ac12579ae36735598fd42ded7fda3b08736f6a6c696"
    const ipfsHash = "QmQ11XQzsKvtwbnDKncRshqz7J8oEf86SzpC8DhjjWfsa9";
    const contract = await hre.ethers.deployContract("BriberBrothers");
    
    await expect(contract.recordTx(wTXID, ipfsHash, {value: 0})).to.be.revertedWithCustomError(contract, "ZeroBribe");
  });

  it("Should save and retrieve the bribe information correctly", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, briber } = await loadFixture(deployAndRecordTxFixture);
    await contract.unlockFunds(wTXID);

    const unlockCallTime = await time.latest();
    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = unlockCallTime + FOURTEEN_DAYS_IN_SECS;

    const bribe = await contract.getBribe(wTXID)

    expect(bribe.amount).to.equal(bribeAmount);
    expect(bribe.ipfsHash).to.equal(ipfsHash);
    expect(bribe.validUntil).to.equal(unlockTime);
    expect(bribe.briber).to.equal(briber);
  });

  it("Should allow an expired bribe to be withdrawn with the correct amount", async function () {
    const { contract, wTXID, bribeAmount, _, briber } = await loadFixture(deployAndRecordTxFixture);
    await contract.unlockFunds(wTXID);

    const unlockCallTime = await time.latest();
    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = unlockCallTime + FOURTEEN_DAYS_IN_SECS;

    await time.increaseTo(unlockTime);
    expect(await contract.connect(briber).withdrawBribe(wTXID, briber.address)).to.changeEtherBalance(briber, BigInt(bribeAmount));
    
    const bribe = await contract.getBribe(wTXID);

    expect(bribe.validUntil).to.equal(0);
    expect(bribe.amount).to.equal(0);
    expect(bribe.briber).to.equal(hre.ethers.ZeroAddress);
    expect(bribe.ipfsHash).to.equal("");
  });

  it("Should not allow anyone other than the briber to withdraw the bribe", async function () {
    const { contract, wTXID, _1, _2, briber } = await loadFixture(deployAndRecordTxFixture);
    await contract.unlockFunds(wTXID);

    const unlockCallTime = await time.latest();
    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = unlockCallTime + FOURTEEN_DAYS_IN_SECS;
    await time.increaseTo(unlockTime);

    const other = await getAnotherSigner(briber);

    await expect(contract.connect(other).withdrawBribe(wTXID, other.address)).to.be.revertedWithCustomError(contract, `NotTheBriber`);
  });

  it("Should not allow the bribe to be withdrawn before it expires", async function () {
    const { contract, wTXID, _1, _2, briber } = await loadFixture(deployAndRecordTxFixture);

    const TEN_DAYS_IN_SECS = 10 * 24 * 60 * 60;
    await time.increase(TEN_DAYS_IN_SECS);

    await expect(contract.connect(briber).withdrawBribe(wTXID, briber.address)).to.be.revertedWithCustomError(contract, "BribeStillValid");
  });

  it("Should not allow another bribe to be placed for the same wTXID", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, briber } = await loadFixture(deployAndRecordTxFixture);
    await expect(contract.connect(briber).recordTx(wTXID, ipfsHash, {value: bribeAmount + 100})).to.be.revertedWithCustomError(contract, "TransactionAlreadyBribed");
  });

  it("Should not allow another bribe to be placed for the same wTXID, even after expiration (before bribe is withdrawn)", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, briber } = await loadFixture(deployAndRecordTxFixture);
    await contract.unlockFunds(wTXID);

    const unlockCallTime = await time.latest();
    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = unlockCallTime + FOURTEEN_DAYS_IN_SECS;
    await time.increaseTo(unlockTime);

    await expect(contract.connect(briber).recordTx(wTXID, ipfsHash, {value: bribeAmount + 100})).to.be.revertedWithCustomError(contract, "TransactionAlreadyBribed");
  });

  it("Should allow another bribe to be placed for the same wTXID, after the bribe is withdrawn", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, briber } = await loadFixture(deployAndRecordTxFixture);
    await contract.unlockFunds(wTXID);

    const unlockCallTime = await time.latest();
    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = unlockCallTime + FOURTEEN_DAYS_IN_SECS;
    await time.increaseTo(unlockTime);

    await contract.connect(briber).withdrawBribe(wTXID, briber.address)
    await contract.connect(briber).recordTx(wTXID, ipfsHash, {value: bribeAmount + 100});
  });

  it("Should not allow a bribes funds to be unlocked twice", async function () {
    const { contract, wTXID, _1, _2, _3 } = await loadFixture(deployAndRecordTxFixture);
    await contract.unlockFunds(wTXID);
    await expect(contract.unlockFunds(wTXID)).to.be.revertedWithCustomError(contract, 'UnlockFundsCalledBefore');
  });

  it("Should not allow anyone other than the briber to request to unlock the funds", async function () {
    const { contract, wTXID, _1, _2, briber } = await loadFixture(deployAndRecordTxFixture);
    const other = await getAnotherSigner(briber);
    await expect(contract.connect(other).unlockFunds(wTXID)).to.be.revertedWithCustomError(contract, 'NotTheBriber');
  });

  it("Should emit a BribePlaced event when a bribe is placed", async function () {
    const wTXID = "0xa62d430d8dae3dfddd7d2ac12579ae36735598fd42ded7fda3b08736f6a6c696"
    const bribeAmount = 100_000_000;
    const ipfsHash = "QmQ11XQzsKvtwbnDKncRshqz7J8oEf86SzpC8DhjjWfsa9";
    const contract = await hre.ethers.deployContract("BriberBrothers");

    await expect(contract.recordTx(wTXID, ipfsHash, {value: bribeAmount}))
      .to.emit(contract, "BribePlaced")
      .withArgs(wTXID, bribeAmount, ipfsHash);
  });

  it("Should emit a BribeWithdrawn event when a bribe is withdrawn", async function () {
    const { contract, wTXID, _1, _2, briber } = await loadFixture(deployAndRecordTxFixture);
    await contract.unlockFunds(wTXID);
    const unlockCallTime = await time.latest();
    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = unlockCallTime + FOURTEEN_DAYS_IN_SECS;

    await time.increaseTo(unlockTime);

    await expect(contract.withdrawBribe(wTXID, briber.address))
      .to.emit(contract, "BribeWithdrawn")
      .withArgs(wTXID);
  });
});