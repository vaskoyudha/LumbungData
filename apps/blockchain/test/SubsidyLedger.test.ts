import { expect } from "chai";
import { ethers } from "hardhat";
import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import type { SubsidyLedger } from "../typechain-types";

describe("SubsidyLedger", () => {
  let contract: SubsidyLedger;
  let owner: HardhatEthersSigner;
  let distributor: HardhatEthersSigner;
  let farmer: HardhatEthersSigner;
  let unauthorized: HardhatEthersSigner;

  beforeEach(async () => {
    [owner, distributor, farmer, unauthorized] = await ethers.getSigners() as [
      HardhatEthersSigner,
      HardhatEthersSigner,
      HardhatEthersSigner,
      HardhatEthersSigner,
    ];
    const SubsidyLedgerFactory = await ethers.getContractFactory("SubsidyLedger");
    contract = await SubsidyLedgerFactory.deploy() as unknown as SubsidyLedger;
    await contract.waitForDeployment();
  });

  describe("Deployment", () => {
    it("sets owner correctly", async () => {
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("owner is not authorized as distributor by default", async () => {
      expect(await contract.authorizedDistributors(owner.address)).to.equal(false);
    });
  });

  describe("Access Control", () => {
    it("owner can add distributor", async () => {
      await expect(contract.addDistributor(distributor.address))
        .to.emit(contract, "DistributorAdded")
        .withArgs(distributor.address);
      expect(await contract.authorizedDistributors(distributor.address)).to.equal(true);
    });

    it("non-owner cannot add distributor", async () => {
      await expect(
        contract.connect(unauthorized).addDistributor(distributor.address)
      ).to.be.revertedWithCustomError(contract, "NotOwner");
    });

    it("owner can remove distributor", async () => {
      await contract.addDistributor(distributor.address);
      await expect(contract.removeDistributor(distributor.address))
        .to.emit(contract, "DistributorRemoved")
        .withArgs(distributor.address);
      expect(await contract.authorizedDistributors(distributor.address)).to.equal(false);
    });
  });

  describe("Record Distribution", () => {
    beforeEach(async () => {
      await contract.addDistributor(distributor.address);
    });

    it("authorized distributor can record distribution", async () => {
      const tx = contract.connect(distributor).recordDistribution(
        farmer.address,
        "seed",
        "Padi IR64",
        BigInt(50),
        "kg"
      );
      await expect(tx).to.emit(contract, "DistributionRecorded");
    });

    it("unauthorized address cannot record distribution", async () => {
      await expect(
        contract.connect(unauthorized).recordDistribution(
          farmer.address,
          "seed",
          "Padi IR64",
          BigInt(50),
          "kg"
        )
      ).to.be.revertedWithCustomError(contract, "NotAuthorized");
    });

    it("rejects zero quantity", async () => {
      await expect(
        contract.connect(distributor).recordDistribution(
          farmer.address,
          "seed",
          "Padi IR64",
          BigInt(0),
          "kg"
        )
      ).to.be.revertedWithCustomError(contract, "ZeroQuantity");
    });

    it("rejects zero address farmer", async () => {
      await expect(
        contract.connect(distributor).recordDistribution(
          ethers.ZeroAddress,
          "seed",
          "Padi IR64",
          BigInt(50),
          "kg"
        )
      ).to.be.revertedWithCustomError(contract, "ZeroAddress");
    });
  });

  describe("Query Distributions", () => {
    beforeEach(async () => {
      await contract.addDistributor(distributor.address);
      await contract.connect(distributor).recordDistribution(
        farmer.address, "seed", "Padi IR64", BigInt(50), "kg"
      );
      await contract.connect(distributor).recordDistribution(
        farmer.address, "fertilizer", "Urea", BigInt(100), "kg"
      );
    });

    it("returns all distributions for farmer", async () => {
      const distributions = await contract.getDistributions(farmer.address);
      expect(distributions.length).to.equal(2);
    });

    it("returns correct distribution count", async () => {
      const count = await contract.getDistributionCount(farmer.address);
      expect(count).to.equal(BigInt(2));
    });

    it("distributions have correct data", async () => {
      const distributions = await contract.getDistributions(farmer.address);
      const first = distributions[0];
      expect(first).to.not.be.undefined;
      expect(first!.itemType).to.equal("seed");
      expect(first!.itemName).to.equal("Padi IR64");
      expect(first!.quantity).to.equal(BigInt(50));
      expect(first!.unit).to.equal("kg");
      expect(first!.distributorId).to.equal(distributor.address);
    });

    it("returns empty array for farmer with no distributions", async () => {
      const distributions = await contract.getDistributions(unauthorized.address);
      expect(distributions.length).to.equal(0);
    });
  });
});
