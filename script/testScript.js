async function main() {
    const contractAddress = "0x3438Bb9A0D4C456FdfC2E0CA3bf66875e5998A7D";
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

    let check_blockHeader = await myContract._callVerifyInclusion(4246, "0x0101522553c73c800c00cdc4479eb82e3dc5ac6663bfb77c1be25f17c188bd9f", "0x0101522553c73c800c00cdc4479eb82e3dc5ac6663bfb77c1be25f17c188bd9f6053a0220a47b0c29c1a28d6ff93ec80417f56dc332487462e0f80fe98fe6cb3", 1);
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