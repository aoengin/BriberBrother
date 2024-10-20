import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const BriberBrosModule = buildModule("BriberBrosModule", (m) => {
  const briberBros = m.contract("BriberBros", []);

  return { briberBros };
});

export default BriberBrosModule;