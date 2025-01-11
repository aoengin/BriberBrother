async function main() {

    /*
        struct BlockHeader {
        bytes4 version;
        bytes32 prevBlock;
        bytes32 merkleRoot;
        bytes4 time;
        bytes4 bits;
        bytes4 nonce;
    }

        struct BribedTx {
        bytes32 wTXID;
        bytes proof;
        uint64 index;
    }
    */

    const contractAddress = "0x3438Bb9A0D4C456FdfC2E0CA3bf66875e5998A7D";
    const myContract = await hre.ethers.getContractAt("BriberBrothers", contractAddress);

    // const result_index = await myContract.recordTx("0x97722D07C233FAA5752DB046E0BA85D06ECD911425DD5A4816CDD00CB3EB71A0", "ipfs_link", {value: ethers.parseEther("1")});
    // const result = await myContract.getBribe("0x97722D07C233FAA5752DB046E0BA85D06ECD911425DD5A4816CDD00CB3EB71A0");
    // console.log("Result: ", result.toString());

    const bribedTx = {
        wTXID: "0x97722D07C233FAA5752DB046E0BA85D06ECD911425DD5A4816CDD00CB3EB71A0",
        proof: "0x0000000000000000000000000000000000000000000000000000000000000000",
        index: 1
    }

    const blockHeader = {
        version: "0x00000020",
        prevBlock: "0xc39d77db298add34c9e059d2b6581fe6563feb5b30e4a6a4fa0c8bb9b266b625",
        merkleRoot: "0x0c9d9455e1fdb4487706621290dfa896cfd73f68ce9be858ec3ba2a8e8810968",
        time: "0x82b87d67",
        bits: "0xffff7f20",
        nonce: "0x00000000"
    }

    const coinbaseTxParams = {
        version: "0x02000000",
        inputs: "0x010000000000000000000000000000000000000000000000000000000000000000ffffffff0403a1cd00fdffffff",
        outputs: "0x0300000000000000001600142ae1df7f8d8251fb543c333f4a838d133170b2020000000000000000266a24aa21a9ed84e963438d247aee0bbf65c9f28856d6ed1ce9d1eebe20cbb9d38b472078085300000000000000000a6a080000000000000001",
        locktime: "0x00000000",
        index: 2
     }
 
     const CoinbaseTransaction = {
         coinbaseTxParams: coinbaseTxParams,
         proof: "0xb1d36f6fd95eb480f0e30adbab3d527e20e1324e6f32f983bc015f25d6376a8c",
         index: 0
     }

    // call with an amount of 1 ether
    const result = await myContract.bribeMe(CoinbaseTransaction, blockHeader, bribedTx, 52641);
    console.log("Result: ", result.toString());

}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });