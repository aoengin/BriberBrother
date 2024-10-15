require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

module.exports = {
  solidity: "0.8.27",
  networks: {
      citrea: {
          url: process.env.CITREA_URL, 
          accounts: [process.env.PRIVATE_KEY]
      }
  }
};

