async function main() {
    const contractAddress = "0xbf49952e386a63c1d52Ff1a5D9758E251179fD03";
    const myContract = await hre.ethers.getContractAt("BriberBrothers", contractAddress);

    // all in little endian
    
    version = "0x00000020"
    previousblock = "0x2942732293ACA7BE686D19613AA40951EF6A5E6BAFC981991EEB0465B3590436"
    merkleroot = "0x2684CD01EB69BA486638A401EE56939AF3F5E8AC080993691EF4557088193409"
    time = "0x788D3867"
    bits = "0xFFFF7F20"
    nonce = "0x00000000"

    let blockHeader = {
        version: version,
        prevBlock: previousblock,
        merkleRoot: merkleroot,
        time: time,
        bits: bits,
        nonce: nonce
    }

    let check_blockHeader = await myContract.calculateAndCompareHash(blockHeader, 3758);
    let result = await myContract.callGetBlockHash(3758);
    console.log(check_blockHeader);
    console.log(result);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });