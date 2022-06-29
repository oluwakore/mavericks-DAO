// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";



interface IPseudoNFTMarketplace {

    function getPrice() external view returns (uint256);

    function available(uint256 _tokenId) external view returns (bool);

    function purchase(uint256 _tokenId) external payable;
  }


   interface IMavericksNFT {

    function  balanceOf(address owner) external view returns (uint256);

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256);
  }


contract MaverickDAO is Ownable {

  struct Proposal {
    //to purchase from marketplace
    uint256 nftTokenId;

    uint256 deadline;

    uint256 votesFor;

    uint256 votesAgainst;

    bool executed;

    mapping(uint256 => bool) voters;
  }

  // oui is 0, non is 1
  enum Vote {
    OUI, 
    NON
  }

  mapping(uint256 => Proposal) public proposals;

  uint256 public noOfProposals;

  IPseudoNFTMarketplace nftMarketplace;
  
  IMavericksNFT mavericksNFT;

  constructor(address _nftMarketplace, address _mavericksNFT) payable {
    nftMarketplace = IPseudoNFTMarketplace(_nftMarketplace);
    mavericksNFT = IMavericksNFT(_mavericksNFT);
  }

  modifier nftHolderOnly() {
    require(mavericksNFT.balanceOf(msg.sender) > 0, "NOT_A_MEMBER_OF_THE_DAO");
    _;
  }

  function makeProposal(uint256 _nftTokenId) external nftHolderOnly returns(uint256) {
    require(nftMarketplace.available(_nftTokenId), "NFT_NOT_UP_FOR_SALE");
    Proposal storage proposal = proposals[noOfProposals];
    proposal.nftTokenId = _nftTokenId;
    proposal.deadline = block.timestamp + 10 minutes;

    noOfProposals++;

    return noOfProposals - 1;
  }


   modifier activeProposalOnly(uint256 proposalIndex) {
    require(proposals[proposalIndex].deadline > block.timestamp, "DEADLINE_EXCEEDED");
    _;
   }

  function voteOnProposal(uint256 proposalIndex, Vote vote) external nftHolderOnly activeProposalOnly(proposalIndex) {
    Proposal storage proposal = proposals[proposalIndex];

    uint256 voterNFTBalance = mavericksNFT.balanceOf(msg.sender);
    uint256 numVotes = 0;

    for (uint256 i = 0; i < voterNFTBalance; i++) {
      uint256 tokenId = mavericksNFT.tokenOfOwnerByIndex(msg.sender, i);
      if (proposal.voters[tokenId] == false) {
        numVotes++;
        proposal.voters[tokenId] = true;
      }
    }
    require(numVotes > 0, "ALREADY_VOTED");

    if (vote == Vote.OUI) {
       proposal.votesFor += numVotes;
    } else {
      proposal.votesAgainst += numVotes;
    }
  }

  modifier inactiveProposalOnly(uint256 proposalIndex) {
    require(proposals[proposalIndex].deadline <= block.timestamp, "DEADLINE_NOT_EXCEEDED");
    require(proposals[proposalIndex].executed == false, "PROPOSAL_ALREADY_EXECUTED");
    _;
  }

  function executeProposal(uint256 proposalIndex) external nftHolderOnly inactiveProposalOnly(proposalIndex) {

    Proposal storage proposal = proposals[proposalIndex];

    if(proposal.votesFor > proposal.votesAgainst) {
      uint256 nftPrice = nftMarketplace.getPrice();
      require(address(this).balance >= nftPrice, "NOT_ENOUGH_FUNDS");
      nftMarketplace.purchase{value: nftPrice}(proposal.nftTokenId);
    }
    proposal.executed = true;
  }



  function withdrawEther() external onlyOwner {
    payable(owner()).transfer(address(this).balance);
  }

  receive() external payable {}

  fallback() external payable {}


}