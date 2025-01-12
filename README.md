# Briber Brother
Briber Brother is a project aimed at helping Bitcoin miners identify and include transactions that adhere to Bitcoin's consensus rules but are classified as non-standard. It also enables users to offer incentives on an external blockchain to facilitate the inclusion of their Bitcoin transactions.

Since Bitcoin’s P2P network does not relay non-standard transactions, getting them mined can be difficult. Briber Brother addresses this challenge by introducing a system that:

- Allows miners to efficiently detect and process non-standard transactions.
- Enables users to provide incentives on another blockchain to encourage miners to include their transactions.
- Ensures proper verification of incentivized transactions once they are successfully mined.

## Requirements
### Smart Contract
- Solidity (Contracts are written in Solidity)
- Any tool supporting Solidity compilation and deployment is sufficient.

### Miner Node
- Rust (Required to run the miner)
- Makefile (Miners can compile the project using a Makefile)

### Testing
- Citrea Sequencer (Required to test the contract locally)
- Bitcoin Regtest (For local Bitcoin blockchain testing)

The setup guide for running the Citrea Sequencer can be found here:
[Citrea Sequencer Setup Guide](https://github.com/chainwayxyz/citrea/blob/nightly/docs/run-dev.md)

Please refer to the [Detailed Use Case Testing](docs/use-case-test.md
) section for more information.


## Credits
This project uses code from the following repository:
- [bitcoin-spv](https://github.com/keep-network/bitcoin-spv/tree/856849612ef49114af18c0f407eaa74afc2ee4be) licensed under LGPL.

The LGPL license is included in this project (under the folder external) for reference.

