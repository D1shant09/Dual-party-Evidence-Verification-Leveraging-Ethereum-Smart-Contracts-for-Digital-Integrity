// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentVerification {
    struct Document {
        string ipfsHash;
        address provider;
        address recipient;
        bool isValid;
        bool isInChangePhase;
        string proof;
    }

    address public owner;

    mapping(address => uint256[]) public providerDocs;
    mapping(address => uint256[]) public RecipientDocs;
    mapping(uint256 => Document) internal validDocuments;
    mapping(uint256 => Document) internal documents;
    mapping(address => mapping(uint256 => bool)) public approvals;
    mapping(address => mapping(uint256 => bool)) public viewers;
    mapping(uint256 => uint256) public validations; // Tracks validation count per document
    mapping(address => bool) public validators; // Tracks approved validators
    mapping(uint256 => uint256) public disputeRounds; // Tracks dispute round per document
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasValidatedRound; // docId => round => validator => voted
    uint256 public validationLimit = 1; // Configurable validation limit
    uint256 public documentCount;

    event DocumentAdded(uint256 indexed documentId, address indexed provider, address indexed recipient, string ipfsHash);
    event DocumentUpdated(uint256 indexed documentId, string newIpfsHash);
    event DocumentChallenge(uint256 indexed documentId, string newIpfsHash, string proof, string witness);
    event DocumentValidated(uint256 indexed documentId, address indexed validator);
    event ViewerApproved(uint256 indexed documentId, address indexed viewer);
    event ViewerRevoked(uint256 indexed documentId, address indexed viewer);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can perform this action");
        _;
    }

    modifier onlyProvider(uint256 documentId) {
        require(documents[documentId].provider == msg.sender, "Only the provider can perform this action");
        _;
    }

    modifier onlyRecipient(uint256 documentId) {
        require(documents[documentId].recipient == msg.sender, "Only the recipient can perform this action");
        _;
    }

    modifier onlyValidator() {
        require(validators[msg.sender], "Only validators can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addEmptyDocument(address recipient) public returns (uint256) {
        require(recipient != address(0), "Recipient address cannot be zero");
        documentCount++;
        documents[documentCount] = Document({
            ipfsHash: "",
            provider: msg.sender,
            recipient: recipient,
            isValid: false,
            isInChangePhase: false,
            proof: ""
        });
        viewers[recipient][documentCount] = true;
        viewers[msg.sender][documentCount] = true;

        providerDocs[msg.sender].push(documentCount);
        RecipientDocs[recipient].push(documentCount);
        emit DocumentAdded(documentCount, msg.sender, recipient, "");
        return documentCount;
    }

    function approveDocumentChange(uint256 documentId) public onlyRecipient(documentId) {
        approvals[msg.sender][documentId] = true;
    }

    function updateDocument(uint256 documentId, string memory newIpfsHash) public onlyProvider(documentId) {
        require(approvals[documents[documentId].recipient][documentId], "Recipient must approve the change");
        documents[documentId].ipfsHash = newIpfsHash;
        documents[documentId].isValid = false;
        approvals[documents[documentId].recipient][documentId] = false;
        emit DocumentUpdated(documentId, newIpfsHash);
    }

    function validateDocument(uint256 documentId) public onlyRecipient(documentId) {
        documents[documentId].isValid = true;
        documents[documentId].isInChangePhase = false;
        validDocuments[documentId] = documents[documentId]; // Move to validDocuments
        emit DocumentValidated(documentId, msg.sender);
    }

    function forceUpdateDocument(uint256 documentId, string memory newIpfsHash, string memory proof) public onlyProvider(documentId) {
        if (documents[documentId].isValid) {
            validDocuments[documentId] = documents[documentId]; // Save current valid document
        }
        disputeRounds[documentId]++;
        validations[documentId] = 0;
        documents[documentId].ipfsHash = newIpfsHash;
        documents[documentId].isInChangePhase = true;
        documents[documentId].isValid = false;
        documents[documentId].proof = proof;
        emit DocumentChallenge(documentId, newIpfsHash, proof, "");
    }

    function challengeDocument(uint256 documentId, string memory newIpfsHash, string memory witness) public onlyRecipient(documentId) {
        require(documents[documentId].isInChangePhase, "Document must be in change phase to challenge");
        documents[documentId].ipfsHash = newIpfsHash;
        documents[documentId].isInChangePhase = false;
        emit DocumentChallenge(documentId, newIpfsHash, documents[documentId].proof, witness);
    }

    function validateFromValidators(uint256 documentId) public onlyValidator {
        uint256 currentRound = disputeRounds[documentId];
        require(!hasValidatedRound[documentId][currentRound][msg.sender], "Already validated by this validator");
        hasValidatedRound[documentId][currentRound][msg.sender] = true;
        validations[documentId]++;
        if (validations[documentId] >= validationLimit) {
            documents[documentId].isValid = true;
            documents[documentId].isInChangePhase = false;
            validDocuments[documentId] = documents[documentId]; // Move to validDocuments
            emit DocumentValidated(documentId, msg.sender);
        }
    }

    function hasValidated(uint256 documentId, address validator) external view returns (bool) {
        return hasValidatedRound[documentId][disputeRounds[documentId]][validator];
    }

    function approveViewer(uint256 documentId, address viewer) public onlyRecipient(documentId) {
        viewers[viewer][documentId] = true;
        emit ViewerApproved(documentId, viewer);
    }

    function revokeViewer(uint256 documentId, address viewer) public onlyRecipient(documentId) {
        viewers[viewer][documentId] = false;
        emit ViewerRevoked(documentId, viewer);
    }

    function viewDocument(uint256 documentId) public view returns (string memory) {
        require(viewers[msg.sender][documentId], "You are not approved to view this document");
        return documents[documentId].ipfsHash;
    }

    function setValidationLimit(uint256 newLimit) public onlyOwner {
        require(newLimit > 0, "Validation limit must be at least 1");
        validationLimit = newLimit;
    }

    function addValidator(address validator) public onlyOwner {
        require(validator != address(0), "Validator address cannot be zero");
        validators[validator] = true;
    }

    function getRecipientDocs(address recipient) external view returns (uint256[] memory) {
        return RecipientDocs[recipient];
    }

    function getProviderDocs(address provider) external view returns (uint256[] memory) {
        return providerDocs[provider];
    }

    function getDocument(uint256 documentId) external view returns (Document memory) {
        require(
            documents[documentId].provider == msg.sender ||
            documents[documentId].recipient == msg.sender ||
            viewers[msg.sender][documentId] ||
            validators[msg.sender] ||
            msg.sender == owner,
            "Access denied: Not authorized to view document"
        );
        return documents[documentId];
    }

    function getValidDocument(uint256 documentId) external view returns (Document memory) {
        require(
            documents[documentId].provider == msg.sender ||
            documents[documentId].recipient == msg.sender ||
            viewers[msg.sender][documentId] ||
            validators[msg.sender] ||
            msg.sender == owner,
            "Access denied: Not authorized to view document"
        );
        return validDocuments[documentId];
    }
}
