const assert = require("node:assert/strict");
const { ethers } = require("hardhat");

describe("DocumentVerification Contract", function () {
  let contract;
  let owner;
  let provider;
  let recipient;
  let validator1;
  let validator2;
  let viewer;
  let unauthorized;

  beforeEach(async function () {
    [owner, provider, recipient, validator1, validator2, viewer, unauthorized] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("DocumentVerification", owner);
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment and Admin Access Control", function () {
    it("sets the deployer as the owner", async function () {
      assert.equal(await contract.owner(), owner.address);
    });

    it("allows owner to set validation limit", async function () {
      await contract.connect(owner).setValidationLimit(2);
      assert.equal(await contract.validationLimit(), 2n);
    });

    it("prevents non-owner from setting validation limit", async function () {
      await assert.rejects(
        contract.connect(unauthorized).setValidationLimit(2),
        /Only the owner can perform this action/
      );
    });

    it("allows owner to add validators", async function () {
      await contract.connect(owner).addValidator(validator1.address);
      assert.equal(await contract.validators(validator1.address), true);
    });

    it("prevents non-owner from adding validators", async function () {
      await assert.rejects(
        contract.connect(unauthorized).addValidator(validator1.address),
        /Only the owner can perform this action/
      );
    });

    it("prevents setting zero address as validator", async function () {
      await assert.rejects(
        contract.connect(owner).addValidator(ethers.ZeroAddress),
        /Validator address cannot be zero/
      );
    });
  });

  describe("Document Creation and Lifecycle", function () {
    it("creates an empty document and updates mapping indexes", async function () {
      const tx = await contract.connect(provider).addEmptyDocument(recipient.address);
      const receipt = await tx.wait();
      assert.ok(receipt);

      assert.equal(await contract.documentCount(), 1n);

      const pDocs = await contract.getProviderDocs(provider.address);
      assert.deepEqual(pDocs.map(Number), [1]);

      const rDocs = await contract.getRecipientDocs(recipient.address);
      assert.deepEqual(rDocs.map(Number), [1]);

      const doc = await contract.getDocument(1n);
      assert.equal(doc.provider, provider.address);
      assert.equal(doc.recipient, recipient.address);
      assert.equal(doc.ipfsHash, "");
      assert.equal(doc.isValid, false);
      assert.equal(doc.isInChangePhase, false);
    });

    it("prevents adding empty document with zero address recipient", async function () {
      await assert.rejects(
        contract.connect(provider).addEmptyDocument(ethers.ZeroAddress),
        /Recipient address cannot be zero/
      );
    });

    it("handles recipient approval and provider update", async function () {
      await contract.connect(provider).addEmptyDocument(recipient.address);

      // Provider cannot update without recipient approval
      await assert.rejects(
        contract.connect(provider).updateDocument(1n, "QmTestHash123"),
        /Recipient must approve the change/
      );

      // Non-recipient cannot approve
      await assert.rejects(
        contract.connect(unauthorized).approveDocumentChange(1n),
        /Only the recipient can perform this action/
      );

      // Recipient approves
      await contract.connect(recipient).approveDocumentChange(1n);
      assert.equal(await contract.approvals(recipient.address, 1n), true);

      // Non-provider cannot update
      await assert.rejects(
        contract.connect(unauthorized).updateDocument(1n, "QmTestHash123"),
        /Only the provider can perform this action/
      );

      // Provider updates document
      const updateTx = await contract.connect(provider).updateDocument(1n, "QmTestHash123");
      await updateTx.wait();

      const doc = await contract.getDocument(1n);
      assert.equal(doc.ipfsHash, "QmTestHash123");
      assert.equal(doc.isValid, false);
      assert.equal(await contract.approvals(recipient.address, 1n), false);
    });

    it("allows recipient to validate document", async function () {
      await contract.connect(provider).addEmptyDocument(recipient.address);
      await contract.connect(recipient).approveDocumentChange(1n);
      await contract.connect(provider).updateDocument(1n, "QmTestHash123");

      // Non-recipient cannot validate
      await assert.rejects(
        contract.connect(unauthorized).validateDocument(1n),
        /Only the recipient can perform this action/
      );

      // Recipient validates
      const valTx = await contract.connect(recipient).validateDocument(1n);
      await valTx.wait();

      const doc = await contract.getDocument(1n);
      assert.equal(doc.isValid, true);
    });
  });

  describe("Validator Voting", function () {
    beforeEach(async function () {
      await contract.connect(owner).addValidator(validator1.address);
      await contract.connect(owner).addValidator(validator2.address);
      await contract.connect(owner).setValidationLimit(2);
      await contract.connect(provider).addEmptyDocument(recipient.address);
    });

    it("requires validator role to validate", async function () {
      await assert.rejects(
        contract.connect(unauthorized).validateFromValidators(1n),
        /Only validators can perform this action/
      );
    });

    it("prevents double-voting by the same validator", async function () {
      await contract.connect(validator1).validateFromValidators(1n);
      assert.equal(await contract.validations(1n), 1n);

      await assert.rejects(
        contract.connect(validator1).validateFromValidators(1n),
        /Already validated by this validator/
      );
    });

    it("marks document valid once validationLimit is reached", async function () {
      await contract.connect(validator1).validateFromValidators(1n);
      let doc = await contract.getDocument(1n);
      assert.equal(doc.isValid, false);

      const valTx = await contract.connect(validator2).validateFromValidators(1n);
      await valTx.wait();

      doc = await contract.getDocument(1n);
      assert.equal(doc.isValid, true);
    });
  });

  describe("Viewer Permissions", function () {
    beforeEach(async function () {
      await contract.connect(provider).addEmptyDocument(recipient.address);
      await contract.connect(recipient).approveDocumentChange(1n);
      await contract.connect(provider).updateDocument(1n, "QmSecretDocumentHash");
    });

    it("allows provider and recipient to view", async function () {
      assert.equal(await contract.connect(provider).viewDocument(1n), "QmSecretDocumentHash");
      assert.equal(await contract.connect(recipient).viewDocument(1n), "QmSecretDocumentHash");
    });

    it("prevents unauthorized accounts from calling viewDocument", async function () {
      await assert.rejects(
        contract.connect(unauthorized).viewDocument(1n),
        /You are not approved to view this document/
      );
    });

    it("allows recipient to approve and revoke viewer", async function () {
      await contract.connect(recipient).approveViewer(1n, viewer.address);
      assert.equal(await contract.connect(viewer).viewDocument(1n), "QmSecretDocumentHash");

      await contract.connect(recipient).revokeViewer(1n, viewer.address);
      await assert.rejects(
        contract.connect(viewer).viewDocument(1n),
        /You are not approved to view this document/
      );
    });
  });
});
