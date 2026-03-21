import { ethers } from "hardhat";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  console.error(`Deploying SubsidyLedger from: ${deployer.address}`);

  const SubsidyLedger = await ethers.getContractFactory("SubsidyLedger");
  const contract = await SubsidyLedger.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.error(`SubsidyLedger deployed to: ${address}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
