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

  describe("Dispute and Challenge Flow (Algorithm 2)", function () {
    beforeEach(async function () {
      await contract.connect(owner).addValidator(validator1.address);
      await contract.connect(provider).addEmptyDocument(recipient.address);
      await contract.connect(recipient).approveDocumentChange(1n);
      await contract.connect(provider).updateDocument(1n, "QmOriginalHash");
      await contract.connect(recipient).validateDocument(1n);
    });

    it("puts validated document into change phase on forceUpdate and resets isValid", async function () {
      let doc = await contract.getDocument(1n);
      assert.equal(doc.isValid, true);
      assert.equal(doc.isInChangePhase, false);

      await contract.connect(provider).forceUpdateDocument(1n, "QmRevisedHash", "Lab revision note");

      doc = await contract.getDocument(1n);
      assert.equal(doc.ipfsHash, "QmRevisedHash");
      assert.equal(doc.proof, "Lab revision note");
      assert.equal(doc.isInChangePhase, true);
      assert.equal(doc.isValid, false);
    });

    it("allows recipient to contest force update via challengeDocument", async function () {
      await contract.connect(provider).forceUpdateDocument(1n, "QmRevisedHash", "Lab revision note");

      await contract.connect(recipient).challengeDocument(1n, "QmCounterHash", "Witness statement text");

      const doc = await contract.getDocument(1n);
      assert.equal(doc.ipfsHash, "QmCounterHash");
      assert.equal(doc.isInChangePhase, false);
    });

    it("clears change phase when recipient validates document", async function () {
      await contract.connect(provider).forceUpdateDocument(1n, "QmRevisedHash", "Lab revision note");
      assert.equal((await contract.getDocument(1n)).isInChangePhase, true);

      await contract.connect(recipient).validateDocument(1n);

      const doc = await contract.getDocument(1n);
      assert.equal(doc.isValid, true);
      assert.equal(doc.isInChangePhase, false);
    });

    it("clears change phase when validators finalize arbitration", async function () {
      await contract.connect(provider).forceUpdateDocument(1n, "QmRevisedHash", "Lab revision note");
      assert.equal((await contract.getDocument(1n)).isInChangePhase, true);

      await contract.connect(validator1).validateFromValidators(1n);

      const doc = await contract.getDocument(1n);
      assert.equal(doc.isValid, true);
      assert.equal(doc.isInChangePhase, false);
    });

    it("prevents validator deadlock across re-disputed rounds", async function () {
      // First force update - round 1
      await contract.connect(provider).forceUpdateDocument(1n, "QmRound1Hash", "Proof 1");
      assert.equal(await contract.disputeRounds(1n), 1n);

      // Validator1 votes in round 1
      await contract.connect(validator1).validateFromValidators(1n);
      assert.equal(await contract.hasValidated(1n, validator1.address), true);

      // Re-voting in same round fails
      await assert.rejects(
        contract.connect(validator1).validateFromValidators(1n),
        /Already validated by this validator/
      );

      // Subsequent dispute / force update creates round 2 and resets vote counter
      await contract.connect(provider).forceUpdateDocument(1n, "QmRound2Hash", "Proof 2");
      assert.equal(await contract.disputeRounds(1n), 2n);
      assert.equal(await contract.validations(1n), 0n);
      assert.equal(await contract.hasValidated(1n, validator1.address), false);

      // Validator1 can vote again in round 2 without deadlock
      await contract.connect(validator1).validateFromValidators(1n);
      assert.equal(await contract.validations(1n), 1n);
      assert.equal(await contract.hasValidated(1n, validator1.address), true);
    });
  });

  describe("Access-Gated Document Inspection", function () {
    beforeEach(async function () {
      await contract.connect(owner).addValidator(validator1.address);
      await contract.connect(provider).addEmptyDocument(recipient.address);
      await contract.connect(recipient).approveDocumentChange(1n);
      await contract.connect(provider).updateDocument(1n, "QmSensitiveEvidence");
    });

    it("restricts getDocument to authorized actors", async function () {
      // Provider, recipient, validator, and owner can inspect
      assert.equal((await contract.connect(provider).getDocument(1n)).ipfsHash, "QmSensitiveEvidence");
      assert.equal((await contract.connect(recipient).getDocument(1n)).ipfsHash, "QmSensitiveEvidence");
      assert.equal((await contract.connect(validator1).getDocument(1n)).ipfsHash, "QmSensitiveEvidence");
      assert.equal((await contract.connect(owner).getDocument(1n)).ipfsHash, "QmSensitiveEvidence");

      // Unauthorized party cannot inspect
      await assert.rejects(
        contract.connect(unauthorized).getDocument(1n),
        /Access denied: Not authorized to view document/
      );

      // Once approved, viewer can inspect
      await contract.connect(recipient).approveViewer(1n, viewer.address);
      assert.equal((await contract.connect(viewer).getDocument(1n)).ipfsHash, "QmSensitiveEvidence");

      // Once revoked, viewer cannot inspect
      await contract.connect(recipient).revokeViewer(1n, viewer.address);
      await assert.rejects(
        contract.connect(viewer).getDocument(1n),
        /Access denied: Not authorized to view document/
      );
    });

    it("shields documents mapping from public access", async function () {
      assert.equal(contract.documents, undefined);
    });
  });

  describe("Rejection and Linked Resubmission Flow", function () {
    const sampleSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

    beforeEach(async function () {
      await contract.connect(owner).addValidator(validator1.address);
      await contract.connect(provider).addEmptyDocument(recipient.address);
      await contract.connect(recipient).approveDocumentChange(1n);
    });

    it("stores sha256 hash when updating document with overloaded updateDocument", async function () {
      await contract.connect(provider)["updateDocument(uint256,string,string)"](
        1n,
        "QmEvidenceWithSha",
        sampleSha256
      );

      const doc = await contract.getDocument(1n);
      assert.equal(doc.ipfsHash, "QmEvidenceWithSha");
      assert.equal(doc.sha256Hash, sampleSha256);
      assert.equal(doc.isRejected, false);
    });

    it("allows recipient to reject unvalidated evidence with reason", async function () {
      await contract.connect(provider).updateDocument(1n, "QmEvidenceBadQuality");

      const rejectTx = await contract.connect(recipient).rejectDocument(1n, "Illegible scan of evidence");
      const receipt = await rejectTx.wait();
      assert.ok(receipt);

      const doc = await contract.getDocument(1n);
      assert.equal(doc.isRejected, true);
      assert.equal(doc.rejectionReason, "Illegible scan of evidence");

      // Verify rejected document cannot be approved or updated
      await assert.rejects(
        contract.connect(recipient).approveDocumentChange(1n),
        /Cannot approve change on rejected document/
      );
      await assert.rejects(
        contract.connect(provider).updateDocument(1n, "QmNewAttempt"),
        /Recipient must approve the change/
      );
      await assert.rejects(
        contract.connect(recipient).validateDocument(1n),
        /Cannot validate rejected document/
      );
      await assert.rejects(
        contract.connect(provider).forceUpdateDocument(1n, "QmForce", "Proof"),
        /Document is rejected/
      );
    });

    it("allows validator to reject unvalidated evidence", async function () {
      await contract.connect(provider).updateDocument(1n, "QmSuspiciousDoc");
      await contract.connect(validator1).rejectDocument(1n, "Forensic hash mismatch");

      const doc = await contract.getDocument(1n);
      assert.equal(doc.isRejected, true);
      assert.equal(doc.rejectionReason, "Forensic hash mismatch");
    });

    it("prevents unauthorized party from rejecting", async function () {
      await contract.connect(provider).updateDocument(1n, "QmDoc");
      await assert.rejects(
        contract.connect(unauthorized).rejectDocument(1n, "Unauthorized rejection"),
        /Only recipient, validator, or owner can reject/
      );
    });

    it("prevents rejecting validated document", async function () {
      await contract.connect(provider).updateDocument(1n, "QmValidDoc");
      await contract.connect(recipient).validateDocument(1n);

      await assert.rejects(
        contract.connect(recipient).rejectDocument(1n, "Late rejection"),
        /Cannot reject validated document/
      );
    });

    it("prevents double rejection", async function () {
      await contract.connect(provider).updateDocument(1n, "QmDoc");
      await contract.connect(recipient).rejectDocument(1n, "First rejection");

      await assert.rejects(
        contract.connect(recipient).rejectDocument(1n, "Second rejection"),
        /Document already rejected/
      );
    });

    it("allows provider to create resubmission linked to rejected document", async function () {
      await contract.connect(provider).updateDocument(1n, "QmRejectedDoc");
      await contract.connect(recipient).rejectDocument(1n, "Chain of custody broken");

      const resubmitTx = await contract.connect(provider)["createResubmission(uint256)"](1n);
      const receipt = await resubmitTx.wait();
      assert.ok(receipt);

      assert.equal(await contract.documentCount(), 2n);
      const newDoc = await contract.getDocument(2n);
      assert.equal(newDoc.provider, provider.address);
      assert.equal(newDoc.recipient, recipient.address);
      assert.equal(newDoc.isRejected, false);
      assert.equal(newDoc.isValid, false);

      const pDocs = await contract.getProviderDocs(provider.address);
      assert.deepEqual(pDocs.map(Number), [1, 2]);
    });

    it("prevents non-provider from creating resubmission", async function () {
      await contract.connect(provider).updateDocument(1n, "QmRejectedDoc");
      await contract.connect(recipient).rejectDocument(1n, "Chain of custody broken");

      await assert.rejects(
        contract.connect(unauthorized)["createResubmission(uint256)"](1n),
        /Only previous provider can resubmit/
      );
    });

    it("prevents resubmission if previous document is not rejected", async function () {
      await contract.connect(provider).updateDocument(1n, "QmActiveDoc");

      await assert.rejects(
        contract.connect(provider)["createResubmission(uint256)"](1n),
        /Can only resubmit after rejection/
      );
    });
  });
});
