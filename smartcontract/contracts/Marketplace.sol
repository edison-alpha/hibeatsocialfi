// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Marketplace is ReentrancyGuard, Ownable(msg.sender) {

    struct Listing {
        uint256 id;
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool isActive;
        uint256 createdAt;
    }

    struct Offer {
        uint256 id;
        address buyer;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool isActive;
        uint256 createdAt;
        uint256 expiresAt;
    }

    // State variables
    uint256 private _listingIdCounter;
    uint256 private _offerIdCounter;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Offer) public offers;

    // NFT contract => tokenId => listingId
    mapping(address => mapping(uint256 => uint256)) public activeListings;

    // NFT contract => tokenId => offerIds
    mapping(address => mapping(uint256 => uint256[])) public tokenOffers;

    // User listings and offers
    mapping(address => uint256[]) public userListings;
    mapping(address => uint256[]) public userOffers;

    // Platform fee (in basis points, e.g., 250 = 2.5%)
    uint256 public platformFee = 250;

    // Events
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    event ListingCancelled(uint256 indexed listingId);
    event ListingSold(uint256 indexed listingId, address indexed buyer, uint256 price);

    event OfferCreated(
        uint256 indexed offerId,
        address indexed buyer,
        address indexed nftContract,
        uint256 tokenId,
        uint256 price
    );

    event OfferAccepted(uint256 indexed offerId, uint256 listingId);
    event OfferCancelled(uint256 indexed offerId);

    constructor() {}

    /**
     * @dev Create a new listing
     */
    function createListing(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) public nonReentrant returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not the owner");
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        // Check if already listed
        require(activeListings[nftContract][tokenId] == 0, "Already listed");

        _listingIdCounter++;
        uint256 listingId = _listingIdCounter;

        listings[listingId] = Listing({
            id: listingId,
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            isActive: true,
            createdAt: block.timestamp
        });

        activeListings[nftContract][tokenId] = listingId;
        userListings[msg.sender].push(listingId);

        emit ListingCreated(listingId, msg.sender, nftContract, tokenId, price);

        return listingId;
    }

    /**
     * @dev Buy a listed NFT
     */
    function buyListing(uint256 listingId) public payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.isActive, "Listing not active");
        require(msg.value >= listing.price, "Insufficient payment");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Calculate platform fee
        uint256 fee = (price * platformFee) / 10000;
        uint256 sellerProceeds = price - fee;

        // Transfer NFT
        IERC721(listing.nftContract).safeTransferFrom(seller, msg.sender, listing.tokenId);

        // Transfer payments
        payable(seller).transfer(sellerProceeds);
        payable(owner()).transfer(fee);

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        // Update state
        listing.isActive = false;
        delete activeListings[listing.nftContract][listing.tokenId];

        emit ListingSold(listingId, msg.sender, price);
    }

    /**
     * @dev Cancel a listing
     */
    function cancelListing(uint256 listingId) public {
        Listing storage listing = listings[listingId];
        require(listing.seller == msg.sender, "Not the seller");
        require(listing.isActive, "Listing not active");

        listing.isActive = false;
        delete activeListings[listing.nftContract][listing.tokenId];

        emit ListingCancelled(listingId);
    }

    /**
     * @dev Create an offer for an NFT
     */
    function createOffer(
        address nftContract,
        uint256 tokenId,
        uint256 price,
        uint256 duration
    ) public payable nonReentrant returns (uint256) {
        require(price > 0, "Price must be greater than 0");
        require(msg.value >= price, "Insufficient payment");
        require(duration >= 1 hours && duration <= 30 days, "Invalid duration");

        _offerIdCounter++;
        uint256 offerId = _offerIdCounter;

        offers[offerId] = Offer({
            id: offerId,
            buyer: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            isActive: true,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + duration
        });

        tokenOffers[nftContract][tokenId].push(offerId);
        userOffers[msg.sender].push(offerId);

        emit OfferCreated(offerId, msg.sender, nftContract, tokenId, price);

        return offerId;
    }

    /**
     * @dev Accept an offer
     */
    function acceptOffer(uint256 offerId) public nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.isActive, "Offer not active");
        require(offer.expiresAt > block.timestamp, "Offer expired");
        require(IERC721(offer.nftContract).ownerOf(offer.tokenId) == msg.sender, "Not the owner");

        address buyer = offer.buyer;
        uint256 price = offer.price;

        // Calculate platform fee
        uint256 fee = (price * platformFee) / 10000;
        uint256 sellerProceeds = price - fee;

        // Transfer NFT
        IERC721(offer.nftContract).safeTransferFrom(msg.sender, buyer, offer.tokenId);

        // Transfer payments
        payable(msg.sender).transfer(sellerProceeds);
        payable(owner()).transfer(fee);

        // Update state
        offer.isActive = false;

        // Cancel other offers for this token
        uint256[] storage tokenOfferIds = tokenOffers[offer.nftContract][offer.tokenId];
        for (uint i = 0; i < tokenOfferIds.length; i++) {
            if (tokenOfferIds[i] != offerId && offers[tokenOfferIds[i]].isActive) {
                offers[tokenOfferIds[i]].isActive = false;
                // Refund the offer amount
                payable(offers[tokenOfferIds[i]].buyer).transfer(offers[tokenOfferIds[i]].price);
            }
        }

        emit OfferAccepted(offerId, 0); // 0 means accepted without listing
    }

    /**
     * @dev Cancel an offer
     */
    function cancelOffer(uint256 offerId) public {
        Offer storage offer = offers[offerId];
        require(offer.buyer == msg.sender, "Not the buyer");
        require(offer.isActive, "Offer not active");

        offer.isActive = false;

        // Refund the offer amount
        payable(msg.sender).transfer(offer.price);

        emit OfferCancelled(offerId);
    }

    /**
     * @dev Update platform fee (only owner)
     */
    function setPlatformFee(uint256 newFee) public onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        platformFee = newFee;
    }

    /**
     * @dev Get active listing for an NFT
     */
    function getActiveListing(address nftContract, uint256 tokenId) public view returns (Listing memory) {
        uint256 listingId = activeListings[nftContract][tokenId];
        require(listingId != 0, "No active listing");
        return listings[listingId];
    }

    /**
     * @dev Get offers for an NFT
     */
    function getTokenOffers(address nftContract, uint256 tokenId) public view returns (Offer[] memory) {
        uint256[] memory offerIds = tokenOffers[nftContract][tokenId];
        Offer[] memory tokenOffersArray = new Offer[](offerIds.length);

        for (uint i = 0; i < offerIds.length; i++) {
            tokenOffersArray[i] = offers[offerIds[i]];
        }

        return tokenOffersArray;
    }

    /**
     * @dev Get user listings
     */
    function getUserListings(address user) public view returns (Listing[] memory) {
        uint256[] memory listingIds = userListings[user];
        Listing[] memory userListingsArray = new Listing[](listingIds.length);

        for (uint i = 0; i < listingIds.length; i++) {
            userListingsArray[i] = listings[listingIds[i]];
        }

        return userListingsArray;
    }

    /**
     * @dev Get user offers
     */
    function getUserOffers(address user) public view returns (Offer[] memory) {
        uint256[] memory offerIds = userOffers[user];
        Offer[] memory userOffersArray = new Offer[](offerIds.length);

        for (uint i = 0; i < offerIds.length; i++) {
            userOffersArray[i] = offers[offerIds[i]];
        }

        return userOffersArray;
    }
}

