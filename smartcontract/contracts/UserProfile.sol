// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract UserProfile is Ownable(msg.sender) {

    struct Profile {
        address userAddress;
        uint256 beatsId; // BID - Unique numeric identifier (like Farcaster FID)
        string username;
        string displayName;
        string bio;
        string avatarHash; // IPFS hash
        string bannerHash; // IPFS hash
        string location;
        string website;
        SocialLinks socialLinks;
        bool isVerified;
        bool isArtist;
        uint256 reputationScore;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct SocialLinks {
        string instagram;
        string twitter;
        string youtube;
        string spotify;
        string soundcloud;
        string bandcamp;
        string discord;
        string telegram;
    }

    // Artist specific data
    struct ArtistData {
        string artistName;
        string genre;
        uint256 totalStreams;
        uint256 totalLikes;
        uint256 songCount;
        uint256 followerCount;
        bool isIndependent;
        string recordLabel;
    }

    // State variables
    mapping(address => Profile) public profiles;
    mapping(address => ArtistData) public artistData;
    mapping(string => address) public usernameToAddress; // username => address
    mapping(address => string) public addressToUsername; // address => username
    
    // Beats ID (BID) mappings - like Farcaster FID
    mapping(uint256 => address) public bidToAddress; // BID => address
    mapping(address => uint256) public addressToBid; // address => BID
    uint256 public nextBeatsId = 1; // Start from 1 (0 is reserved for invalid)

    address[] public verifiedArtists;
    mapping(address => bool) public isUserVerified;
    
    // Verification expiry tracking
    mapping(address => uint256) public verificationExpiry; // timestamp when verification expires

    // Artist upgrade fee (20 SOMI = 20 * 10^18 wei) - can be changed by owner
    uint256 public artistUpgradeFee = 20 ether;
    
    // Verification duration (4 months = 120 days)
    uint256 public constant VERIFICATION_DURATION = 120 days;
    
    // Treasury address to receive fees
    address public treasury;

    // Events
    event ProfileCreated(address indexed user, uint256 indexed beatsId, string username);
    event ProfileUpdated(address indexed user);
    event ArtistVerified(address indexed artist, uint256 expiryTime);
    event ArtistUpgraded(address indexed user, uint256 feePaid);
    event VerificationRenewed(address indexed user, uint256 newExpiryTime, uint256 feePaid);
    event VerificationExpired(address indexed user);
    event UsernameChanged(address indexed user, string oldUsername, string newUsername);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ArtistUpgradeFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor() {
        treasury = msg.sender; // Default treasury is contract owner
    }

    /**
     * @dev Update treasury address (only owner)
     */
    function setTreasury(address newTreasury) public onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /**
     * @dev Update artist upgrade fee (only owner)
     */
    function setArtistUpgradeFee(uint256 newFee) public onlyOwner {
        require(newFee > 0, "Fee must be greater than 0");
        uint256 oldFee = artistUpgradeFee;
        artistUpgradeFee = newFee;
        emit ArtistUpgradeFeeUpdated(oldFee, newFee);
    }

    /**
     * @dev Create a new user profile
     */
    function createProfile(
        string memory username,
        string memory displayName,
        string memory bio,
        string memory avatarHash,
        string memory location,
        bool isArtist
    ) public {
        require(profiles[msg.sender].userAddress == address(0), "Profile already exists");
        require(bytes(username).length >= 3, "Username too short");
        require(bytes(username).length <= 30, "Username too long");
        require(usernameToAddress[username] == address(0), "Username taken");

        // Check if username contains only alphanumeric characters and underscores
        bytes memory usernameBytes = bytes(username);
        for (uint i = 0; i < usernameBytes.length; i++) {
            bytes1 char = usernameBytes[i];
            require(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A) || // a-z
                char == 0x5F, // _
                "Invalid username characters"
            );
        }

        // Assign unique Beats ID (BID)
        uint256 beatsId = nextBeatsId;
        nextBeatsId++;

        profiles[msg.sender] = Profile({
            userAddress: msg.sender,
            beatsId: beatsId,
            username: username,
            displayName: displayName,
            bio: bio,
            avatarHash: avatarHash,
            bannerHash: "",
            location: location,
            website: "",
            socialLinks: SocialLinks("", "", "", "", "", "", "", ""),
            isVerified: false,
            isArtist: isArtist,
            reputationScore: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        usernameToAddress[username] = msg.sender;
        addressToUsername[msg.sender] = username;
        
        // Map Beats ID
        bidToAddress[beatsId] = msg.sender;
        addressToBid[msg.sender] = beatsId;

        if (isArtist) {
            artistData[msg.sender] = ArtistData({
                artistName: displayName,
                genre: "",
                totalStreams: 0,
                totalLikes: 0,
                songCount: 0,
                followerCount: 0,
                isIndependent: true,
                recordLabel: ""
            });
        }

        emit ProfileCreated(msg.sender, beatsId, username);
    }

    /**
     * @dev Update user profile
     */
    function updateProfile(
        string memory displayName,
        string memory bio,
        string memory avatarHash,
        string memory bannerHash,
        string memory location,
        string memory website
    ) public {
        require(profiles[msg.sender].userAddress != address(0), "Profile does not exist");

        Profile storage profile = profiles[msg.sender];

        if (bytes(displayName).length > 0) {
            profile.displayName = displayName;
        }
        if (bytes(bio).length > 0) {
            profile.bio = bio;
        }
        if (bytes(avatarHash).length > 0) {
            profile.avatarHash = avatarHash;
        }
        if (bytes(bannerHash).length > 0) {
            profile.bannerHash = bannerHash;
        }
        if (bytes(location).length > 0) {
            profile.location = location;
        }
        if (bytes(website).length > 0) {
            profile.website = website;
        }

        profile.updatedAt = block.timestamp;

        emit ProfileUpdated(msg.sender);
    }

    /**
     * @dev Update social links
     */
    function updateSocialLinks(
        string memory instagram,
        string memory twitter,
        string memory youtube,
        string memory spotify,
        string memory soundcloud,
        string memory bandcamp,
        string memory discord,
        string memory telegram
    ) public {
        require(profiles[msg.sender].userAddress != address(0), "Profile does not exist");

        SocialLinks storage links = profiles[msg.sender].socialLinks;
        links.instagram = instagram;
        links.twitter = twitter;
        links.youtube = youtube;
        links.spotify = spotify;
        links.soundcloud = soundcloud;
        links.bandcamp = bandcamp;
        links.discord = discord;
        links.telegram = telegram;

        profiles[msg.sender].updatedAt = block.timestamp;

        emit ProfileUpdated(msg.sender);
    }

    /**
     * @dev Change username
     */
    function changeUsername(string memory newUsername) public {
        require(profiles[msg.sender].userAddress != address(0), "Profile does not exist");
        require(bytes(newUsername).length >= 3, "Username too short");
        require(bytes(newUsername).length <= 30, "Username too long");
        require(usernameToAddress[newUsername] == address(0), "Username taken");

        string memory oldUsername = profiles[msg.sender].username;

        // Remove old username mapping
        delete usernameToAddress[oldUsername];

        // Update profile
        profiles[msg.sender].username = newUsername;
        profiles[msg.sender].updatedAt = block.timestamp;

        // Add new username mapping
        usernameToAddress[newUsername] = msg.sender;
        addressToUsername[msg.sender] = newUsername;

        emit UsernameChanged(msg.sender, oldUsername, newUsername);
    }

    /**
     * @dev Update artist data
     */
    function updateArtistData(
        string memory artistName,
        string memory genre,
        bool isIndependent,
        string memory recordLabel
    ) public {
        require(profiles[msg.sender].isArtist, "Not an artist");

        ArtistData storage artist = artistData[msg.sender];

        if (bytes(artistName).length > 0) {
            artist.artistName = artistName;
        }
        if (bytes(genre).length > 0) {
            artist.genre = genre;
        }
        artist.isIndependent = isIndependent;
        if (bytes(recordLabel).length > 0) {
            artist.recordLabel = recordLabel;
        }
    }

    /**
     * @dev Upgrade listener to artist with payment
     * Automatically grants verified status for 4 months after payment
     */
    function upgradeToArtist(
        string memory artistName,
        string memory genre,
        bool isIndependent,
        string memory recordLabel
    ) public payable {
        require(profiles[msg.sender].userAddress != address(0), "Profile does not exist");
        require(!profiles[msg.sender].isArtist, "Already an artist");
        require(msg.value >= artistUpgradeFee, "Insufficient payment");

        // Transfer fee to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        // Set isArtist to true (permanent)
        profiles[msg.sender].isArtist = true;
        
        // Auto-verify after payment (expires in 4 months)
        profiles[msg.sender].isVerified = true;
        isUserVerified[msg.sender] = true;
        
        // Set verification expiry (4 months from now)
        uint256 expiryTime = block.timestamp + VERIFICATION_DURATION;
        verificationExpiry[msg.sender] = expiryTime;
        
        // Add to verified artists list if not already there
        bool alreadyInList = false;
        for (uint i = 0; i < verifiedArtists.length; i++) {
            if (verifiedArtists[i] == msg.sender) {
                alreadyInList = true;
                break;
            }
        }
        if (!alreadyInList) {
            verifiedArtists.push(msg.sender);
        }
        
        profiles[msg.sender].updatedAt = block.timestamp;

        // Initialize artist data
        artistData[msg.sender] = ArtistData({
            artistName: artistName,
            genre: genre,
            totalStreams: 0,
            totalLikes: 0,
            songCount: 0,
            followerCount: 0,
            isIndependent: isIndependent,
            recordLabel: recordLabel
        });

        emit ArtistUpgraded(msg.sender, msg.value);
        emit ArtistVerified(msg.sender, expiryTime);
        emit ProfileUpdated(msg.sender);
    }

    /**
     * @dev Renew verification status (4 months extension)
     * Can be called by verified artists to extend their verification
     */
    function renewVerification() public payable {
        require(profiles[msg.sender].userAddress != address(0), "Profile does not exist");
        require(profiles[msg.sender].isArtist, "Not an artist");
        require(msg.value >= artistUpgradeFee, "Insufficient payment");

        // Transfer fee to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "Payment transfer failed");

        // Extend verification
        uint256 currentExpiry = verificationExpiry[msg.sender];
        uint256 newExpiry;
        
        // If already expired or about to expire, start from now
        if (currentExpiry < block.timestamp) {
            newExpiry = block.timestamp + VERIFICATION_DURATION;
        } else {
            // If still valid, extend from current expiry
            newExpiry = currentExpiry + VERIFICATION_DURATION;
        }
        
        verificationExpiry[msg.sender] = newExpiry;
        
        // Ensure verified status is active
        profiles[msg.sender].isVerified = true;
        isUserVerified[msg.sender] = true;
        
        profiles[msg.sender].updatedAt = block.timestamp;

        emit VerificationRenewed(msg.sender, newExpiry, msg.value);
        emit ProfileUpdated(msg.sender);
    }

    /**
     * @dev Check if verification is expired and update status
     * Can be called by anyone to update expired verifications
     */
    function checkAndUpdateVerification(address user) public {
        require(profiles[user].userAddress != address(0), "Profile does not exist");
        
        // If user is verified and has expiry set
        if (profiles[user].isVerified && verificationExpiry[user] > 0) {
            // Check if expired
            if (block.timestamp > verificationExpiry[user]) {
                // Remove verification
                profiles[user].isVerified = false;
                isUserVerified[user] = false;
                
                emit VerificationExpired(user);
            }
        }
    }

    /**
     * @dev Get verification expiry time
     */
    function getVerificationExpiry(address user) public view returns (uint256) {
        return verificationExpiry[user];
    }

    /**
     * @dev Check if verification is active (not expired)
     */
    function isVerificationActive(address user) public view returns (bool) {
        if (!profiles[user].isVerified) {
            return false;
        }
        
        // If no expiry set (manually verified by owner), always active
        if (verificationExpiry[user] == 0) {
            return true;
        }
        
        // Check if not expired
        return block.timestamp <= verificationExpiry[user];
    }

    /**
     * @dev Get days until verification expires
     */
    function getDaysUntilExpiry(address user) public view returns (uint256) {
        if (verificationExpiry[user] == 0 || verificationExpiry[user] <= block.timestamp) {
            return 0;
        }
        
        return (verificationExpiry[user] - block.timestamp) / 1 days;
    }

    /**
     * @dev Get address by Beats ID (BID)
     */
    function getAddressByBeatsId(uint256 beatsId) public view returns (address) {
        return bidToAddress[beatsId];
    }

    /**
     * @dev Get Beats ID (BID) by address
     */
    function getBeatsIdByAddress(address user) public view returns (uint256) {
        return addressToBid[user];
    }

    /**
     * @dev Get total number of profiles created
     */
    function getTotalProfiles() public view returns (uint256) {
        return nextBeatsId - 1;
    }

    /**
     * @dev Get profile by Beats ID (BID)
     */
    function getProfileByBeatsId(uint256 beatsId) public view returns (Profile memory) {
        address user = bidToAddress[beatsId];
        require(user != address(0), "Invalid Beats ID");
        return profiles[user];
    }

    /**
     * @dev Verify artist manually (only owner) - for special cases
     * Manual verification has no expiry (lifetime verification)
     */
    function verifyArtist(address artistAddress) public onlyOwner {
        require(profiles[artistAddress].userAddress != address(0), "Profile does not exist");
        require(profiles[artistAddress].isArtist, "Not an artist");
        require(!profiles[artistAddress].isVerified, "Already verified");

        profiles[artistAddress].isVerified = true;
        isUserVerified[artistAddress] = true;
        
        // Manual verification has no expiry (set to 0)
        verificationExpiry[artistAddress] = 0;
        
        // Add to verified artists list if not already there
        bool alreadyInList = false;
        for (uint i = 0; i < verifiedArtists.length; i++) {
            if (verifiedArtists[i] == artistAddress) {
                alreadyInList = true;
                break;
            }
        }
        if (!alreadyInList) {
            verifiedArtists.push(artistAddress);
        }

        emit ArtistVerified(artistAddress, 0); // 0 = no expiry
    }

    /**
     * @dev Update reputation score
     */
    function updateReputation(address user, uint256 newScore) public onlyOwner {
        require(profiles[user].userAddress != address(0), "Profile does not exist");
        profiles[user].reputationScore = newScore;
    }

    /**
     * @dev Increment artist stats
     */
    function incrementArtistStats(address artist, uint256 streams, uint256 likes, uint256 songs) public onlyOwner {
        if (profiles[artist].isArtist) {
            ArtistData storage data = artistData[artist];
            data.totalStreams += streams;
            data.totalLikes += likes;
            data.songCount += songs;
        }
    }

    /**
     * @dev Get user profile
     */
    function getProfile(address user) public view returns (Profile memory) {
        return profiles[user];
    }

    /**
     * @dev Get artist data
     */
    function getArtistData(address artist) public view returns (ArtistData memory) {
        require(profiles[artist].isArtist, "Not an artist");
        return artistData[artist];
    }

    /**
     * @dev Get address by username
     */
    function getAddressByUsername(string memory username) public view returns (address) {
        return usernameToAddress[username];
    }

    /**
     * @dev Get username by address
     */
    function getUsernameByAddress(address user) public view returns (string memory) {
        return addressToUsername[user];
    }

    /**
     * @dev Get all verified artists
     */
    function getVerifiedArtists() public view returns (address[] memory) {
        return verifiedArtists;
    }

    /**
     * @dev Check if profile exists
     */
    function profileExists(address user) public view returns (bool) {
        return profiles[user].userAddress != address(0);
    }

    /**
     * @dev Get artist upgrade fee
     */
    function getArtistUpgradeFee() public view returns (uint256) {
        return artistUpgradeFee;
    }

    /**
     * @dev Get verification duration in days
     */
    function getVerificationDurationDays() public pure returns (uint256) {
        return VERIFICATION_DURATION / 1 days;
    }

    /**
     * @dev Withdraw funds (only owner) - emergency function
     */
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    // Receive function to accept SOMI payments
    receive() external payable {}
}
