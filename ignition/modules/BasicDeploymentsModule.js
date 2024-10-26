const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("BriberBrosModule", (m) => {
  const briberBros = m.contract("BriberBrothers", []);
  return { briberBros };
});