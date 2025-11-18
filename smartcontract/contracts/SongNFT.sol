// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SongNFT is ERC721, ERC721URIStorage, Ownable(msg.sender), ReentrancyGuard {
    uint256 private _tokenIdCounter;

    struct SongMetadata {
        string title;
        string artist;
        string genre;
        uint256 duration; // in seconds
        string ipfsAudioHash; // IPFS hash for audio file
        string ipfsArtworkHash; // IPFS hash for artwork
        uint256 royaltyPercentage; // in basis points (e.g., 500 = 5%)
        address artistAddress;
        uint256 createdAt;
        bool isExplicit;
        uint256 likeCount;
        uint256 playCount;
    }

    // Token ID => Song Metadata
    mapping(uint256 => SongMetadata) public songMetadata;

    // Artist address => token IDs they created
    mapping(address => uint256[]) public artistSongs;

    // Token ID => user => has liked
    mapping(uint256 => mapping(address => bool)) public hasLiked;

    // Events
    event SongMinted(
        uint256 indexed tokenId,
        address indexed artist,
        string title,
        string ipfsAudioHash
    );

    event RoyaltyPaid(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 amount
    );

    constructor() ERC721("HiBeats Song", "HBSONG") {}

    /**
     * @dev Mint a new song NFT
     * @param to Address to mint the NFT to
     * @param title Song title
     * @param artist Artist name
     * @param genre Music genre
     * @param duration Song duration in seconds
     * @param ipfsAudioHash IPFS hash for audio file
     * @param ipfsArtworkHash IPFS hash for artwork
     * @param royaltyPercentage Royalty percentage in basis points
     * @param isExplicit Whether the song contains explicit content
     * @param metadataURI URI for NFT metadata (IPFS link)
     */
    function mintSong(
        address to,
        string memory title,
        string memory artist,
        string memory genre,
        uint256 duration,
        string memory ipfsAudioHash,
        string memory ipfsArtworkHash,
        uint256 royaltyPercentage,
        bool isExplicit,
        string memory metadataURI
    ) public returns (uint256) {
        require(royaltyPercentage <= 10000, "Royalty cannot exceed 100%");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(artist).length > 0, "Artist cannot be empty");
        require(bytes(ipfsAudioHash).length > 0, "Audio hash cannot be empty");
        require(bytes(metadataURI).length > 0, "Metadata URI cannot be empty");

        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, metadataURI);

        songMetadata[tokenId] = SongMetadata({
            title: title,
            artist: artist,
            genre: genre,
            duration: duration,
            ipfsAudioHash: ipfsAudioHash,
            ipfsArtworkHash: ipfsArtworkHash,
            royaltyPercentage: royaltyPercentage,
            artistAddress: to,
            createdAt: block.timestamp,
            isExplicit: isExplicit,
            likeCount: 0,
            playCount: 0
        });

        artistSongs[to].push(tokenId);

        emit SongMinted(tokenId, to, title, ipfsAudioHash);

        return tokenId;
    }

    /**
     * @dev Override transfer function to handle royalties
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) {
        // Calculate and pay royalty if this is a sale (not gift)
        // This is a simplified version - in production you'd integrate with a marketplace
        if (_isContract(msg.sender)) {
            _payRoyalty(tokenId, from, to);
        }

        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev Pay royalty to the original artist
     */
    function _payRoyalty(uint256 tokenId, address from, address to) internal {
        SongMetadata memory song = songMetadata[tokenId];
        if (song.royaltyPercentage > 0 && song.artistAddress != address(0)) {
            // In a real marketplace, you'd get the sale price from the marketplace contract
            // For now, this is just a placeholder for royalty logic
            // uint256 royaltyAmount = (salePrice * song.royaltyPercentage) / 10000;
            // payable(song.artistAddress).transfer(royaltyAmount);

            emit RoyaltyPaid(tokenId, from, song.artistAddress, 0); // 0 for now
        }
    }

    /**
     * @dev Get song metadata
     */
    function getSongMetadata(uint256 tokenId) public view returns (SongMetadata memory) {
        require(ownerOf(tokenId) != address(0), "Song does not exist");
        return songMetadata[tokenId];
    }

    /**
     * @dev Get all songs by an artist
     */
    function getArtistSongs(address artist) public view returns (uint256[] memory) {
        return artistSongs[artist];
    }

    /**
     * @dev Update song metadata (only by owner or artist)
     */
    function updateSongMetadata(
        uint256 tokenId,
        string memory title,
        string memory genre,
        string memory ipfsArtworkHash
    ) public {
        require(ownerOf(tokenId) != address(0), "Song does not exist");
        require(
            ownerOf(tokenId) == msg.sender || songMetadata[tokenId].artistAddress == msg.sender,
            "Not authorized"
        );

        if (bytes(title).length > 0) {
            songMetadata[tokenId].title = title;
        }
        if (bytes(genre).length > 0) {
            songMetadata[tokenId].genre = genre;
        }
        if (bytes(ipfsArtworkHash).length > 0) {
            songMetadata[tokenId].ipfsArtworkHash = ipfsArtworkHash;
        }
    }

    /**
     * @dev Like a song
     */
    function likeSong(uint256 tokenId) public {
        require(ownerOf(tokenId) != address(0), "Song does not exist");
        require(!hasLiked[tokenId][msg.sender], "Already liked");

        hasLiked[tokenId][msg.sender] = true;
        songMetadata[tokenId].likeCount++;
    }

    /**
     * @dev Unlike a song
     */
    function unlikeSong(uint256 tokenId) public {
        require(ownerOf(tokenId) != address(0), "Song does not exist");
        require(hasLiked[tokenId][msg.sender], "Not liked yet");

        hasLiked[tokenId][msg.sender] = false;
        songMetadata[tokenId].likeCount--;
    }

    /**
     * @dev Record a play of the song
     */
    function recordPlay(uint256 tokenId) public {
        require(ownerOf(tokenId) != address(0), "Song does not exist");
        songMetadata[tokenId].playCount++;
    }
    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

