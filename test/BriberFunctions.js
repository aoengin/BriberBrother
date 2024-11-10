const { expect } = require("chai");
const hre = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("BriberFunctions", function () {

  async function deployAndRecordTxFixture() {
    const wTXID = "0xa62d430d8dae3dfddd7d2ac12579ae36735598fd42ded7fda3b08736f6a6c696"
    const bribeAmount = 100_000_000;
    const ipfsHash = "QmQ11XQzsKvtwbnDKncRshqz7J8oEf86SzpC8DhjjWfsa9";

    const [briber, _] = await hre.ethers.getSigners();
    const contract = await hre.ethers.deployContract("BriberFunctions");
    await contract.recordTx(wTXID, ipfsHash, {value: bribeAmount})
    const bribeTime = await time.latest();

    return {contract, wTXID, bribeAmount, ipfsHash, briber, bribeTime};
  }

  it("Should save and retrieve the bribe information correctly", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, _, bribeTime} = await loadFixture(deployAndRecordTxFixture);

    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = bribeTime + FOURTEEN_DAYS_IN_SECS;

    expect(await contract.getBribeAmount(wTXID)).to.equal(bribeAmount);
    expect(await contract.getBribeTransactionIPFS(wTXID)).to.equal(ipfsHash);
    expect(await contract.getBribeExpirationTime(wTXID)).to.equal(unlockTime);
  });

  it("Should allow an expired bribe to be withdrawn with the correct amount", async function () {
    const { contract, wTXID, bribeAmount, _, briber, bribeTime} = await loadFixture(deployAndRecordTxFixture);

    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = bribeTime + FOURTEEN_DAYS_IN_SECS;

    await time.increaseTo(unlockTime);
    expect(await contract.connect(briber).withdrawBribe(wTXID, briber.address)).to.changeEtherBalance(briber, BigInt(bribeAmount));
  });

  it("Should not allow anyone other than the briber to withdraw the bribe", async function () {
    const { contract, wTXID, _1, _2, briber, bribeTime} = await loadFixture(deployAndRecordTxFixture);

    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = bribeTime + FOURTEEN_DAYS_IN_SECS;
    await time.increaseTo(unlockTime);

    const signers = await hre.ethers.getSigners();
    let other;
    if (briber.address == signers[0].address){
      other = signers[1];
    } 
    else {
      other = signers[0];
    }
    await expect(contract.connect(other).withdrawBribe(wTXID, other.address)).to.be.revertedWithCustomError(contract, `NotTheBriber`);
  });

  it("Should not allow the bribe to be withdrawn before it expires", async function () {
    const { contract, wTXID, _1, _2, briber, _3} = await loadFixture(deployAndRecordTxFixture);

    const TEN_DAYS_IN_SECS = 10 * 24 * 60 * 60;
    await time.increase(TEN_DAYS_IN_SECS);

    await expect(contract.connect(briber).withdrawBribe(wTXID, briber.address)).to.be.revertedWithCustomError(contract, "BribeStillValid");
  });

  it("Should not allow another bribe to be placed for the same wTXID", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, briber, _} = await loadFixture(deployAndRecordTxFixture);
    await expect(contract.connect(briber).recordTx(wTXID, ipfsHash, {value: bribeAmount + 100})).to.be.revertedWithCustomError(contract, "TransactionAlreadyBribed");
  });

  it("Should not allow another bribe to be placed for the same wTXID, even after expiration (before bribe is withdrawn)", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, briber, bribeTime} = await loadFixture(deployAndRecordTxFixture);

    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = bribeTime + FOURTEEN_DAYS_IN_SECS;
    await time.increaseTo(unlockTime);

    await expect(contract.connect(briber).recordTx(wTXID, ipfsHash, {value: bribeAmount + 100})).to.be.revertedWithCustomError(contract, "TransactionAlreadyBribed");
  });

  it("Should allow another bribe to be placed for the same wTXID, after the bribe is withdrawn", async function () {
    const { contract, wTXID, bribeAmount, ipfsHash, briber, bribeTime} = await loadFixture(deployAndRecordTxFixture);

    const FOURTEEN_DAYS_IN_SECS = 14 * 24 * 60 * 60;
    const unlockTime = bribeTime + FOURTEEN_DAYS_IN_SECS;
    await time.increaseTo(unlockTime);

    await contract.connect(briber).withdrawBribe(wTXID, briber.address)
    await contract.connect(briber).recordTx(wTXID, ipfsHash, {value: bribeAmount + 100});
  });
});