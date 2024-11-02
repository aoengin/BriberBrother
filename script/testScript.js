async function main() {
    const contractAddress = "0x3438Bb9A0D4C456FdfC2E0CA3bf66875e5998A7D";
    const myContract = await hre.ethers.getContractAt("BriberBrothers", contractAddress);
    
    const params = {
        version: "0x02000000",
        inputs: "0x010000000000000000000000000000000000000000000000000000000000000000ffffffff0302dd0bfdffffff",
        outputs: "0x039a270000000000001600142ae1df7f8d8251fb543c333f4a838d133170b2020000000000000000266a24aa21a9ed52aa71ed366f1b85f0dc57d56d559eb8c340ce7ca3822e01a8afd9ad9b9128be00000000000000000a6a080000000000000001",
        locktime: "0x00000000",
        index: 2
    };

    let proof = "0x48068c1253f2dfc7c648c4f5ad5294a780cbee2867e1d6069a7939d4093a2ba7275d336127690e1fbd0e222bda5d462ee2edfebf63745747119f8032c111a41d567f4aa91441ced49c236b6ff3a9ec9c68b8ce86d6440a44a84695fcff1dc6a91c9efad915151fb159d1d84f27fde1290797e56ac43a77b06933f940742c9c7b";
    let merkleRoot = "0x169cabf36f3709d9ab8b14c05652e2da38806f0e6f308adc64ebd4d12cecac01";
    let address = await myContract.bribeMe(params, merkleRoot, proof, 0);
    console.log("Address:", address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });