// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AlbumManager is Ownable(msg.sender) {
    
    enum AlbumType { SINGLE, EP, ALBUM }
    
    struct Album {
        uint256 albumId;
        address artist;
        string title;
        string description;
        string coverImageHash; // IPFS hash
        AlbumType albumType;
        uint256[] songTokenIds; // Array of SongNFT token IDs
        uint256 createdAt;
        uint256 releaseDate;
        bool isPublished;
        string metadataURI;
    }
    
    // Storage
    mapping(uint256 => Album) public albums;
    mapping(address => uint256[]) public artistAlbums; // artist => album IDs
    mapping(uint256 => bool) public songInAlbum; // songTokenId => isInAlbum
    
    uint256 private _albumIdCounter;
    
    // Events
    event AlbumCreated(
        uint256 indexed albumId,
        address indexed artist,
        string title,
        AlbumType albumType
    );
    
    event SongAddedToAlbum(
        uint256 indexed albumId,
        uint256 indexed songTokenId
    );
    
    event SongRemovedFromAlbum(
        uint256 indexed albumId,
        uint256 indexed songTokenId
    );
    
    event AlbumPublished(
        uint256 indexed albumId,
        uint256 releaseDate
    );
    
    constructor() {}
    
    /**
     * @dev Create a new album/EP/single collection
     */
    function createAlbum(
        string memory title,
        string memory description,
        string memory coverImageHash,
        AlbumType albumType,
        string memory metadataURI
    ) public returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        
        _albumIdCounter++;
        uint256 albumId = _albumIdCounter;
        
        albums[albumId] = Album({
            albumId: albumId,
            artist: msg.sender,
            title: title,
            description: description,
            coverImageHash: coverImageHash,
            albumType: albumType,
            songTokenIds: new uint256[](0),
            createdAt: block.timestamp,
            releaseDate: 0,
            isPublished: false,
            metadataURI: metadataURI
        });
        
        artistAlbums[msg.sender].push(albumId);
        
        emit AlbumCreated(albumId, msg.sender, title, albumType);
        
        return albumId;
    }
    
    /**
     * @dev Add song to album
     */
    function addSongToAlbum(uint256 albumId, uint256 songTokenId) public {
        require(albums[albumId].artist == msg.sender, "Not album owner");
        require(!albums[albumId].isPublished, "Album already published");
        require(!songInAlbum[songTokenId], "Song already in an album");
        
        // Check album type constraints
        AlbumType albumType = albums[albumId].albumType;
        uint256 currentSongCount = albums[albumId].songTokenIds.length;
        
        if (albumType == AlbumType.SINGLE) {
            require(currentSongCount < 1, "Single can only have 1 song");
        } else if (albumType == AlbumType.EP) {
            require(currentSongCount < 6, "EP can have maximum 6 songs");
        }
        // ALBUM has no limit
        
        albums[albumId].songTokenIds.push(songTokenId);
        songInAlbum[songTokenId] = true;
        
        emit SongAddedToAlbum(albumId, songTokenId);
    }
    
    /**
     * @dev Remove song from album (only if not published)
     */
    function removeSongFromAlbum(uint256 albumId, uint256 songTokenId) public {
        require(albums[albumId].artist == msg.sender, "Not album owner");
        require(!albums[albumId].isPublished, "Album already published");
        
        uint256[] storage songs = albums[albumId].songTokenIds;
        for (uint256 i = 0; i < songs.length; i++) {
            if (songs[i] == songTokenId) {
                songs[i] = songs[songs.length - 1];
                songs.pop();
                songInAlbum[songTokenId] = false;
                
                emit SongRemovedFromAlbum(albumId, songTokenId);
                return;
            }
        }
        
        revert("Song not in album");
    }
    
    /**
     * @dev Publish album (makes it immutable)
     */
    function publishAlbum(uint256 albumId, uint256 releaseDate) public {
        require(albums[albumId].artist == msg.sender, "Not album owner");
        require(!albums[albumId].isPublished, "Album already published");
        require(albums[albumId].songTokenIds.length > 0, "Album has no songs");
        
        // Validate song count for type
        AlbumType albumType = albums[albumId].albumType;
        uint256 songCount = albums[albumId].songTokenIds.length;
        
        if (albumType == AlbumType.SINGLE) {
            require(songCount == 1, "Single must have exactly 1 song");
        } else if (albumType == AlbumType.EP) {
            require(songCount >= 2 && songCount <= 6, "EP must have 2-6 songs");
        } else {
            require(songCount >= 7, "Album must have at least 7 songs");
        }
        
        albums[albumId].isPublished = true;
        albums[albumId].releaseDate = releaseDate;
        
        emit AlbumPublished(albumId, releaseDate);
    }
    
    /**
     * @dev Update album metadata (only if not published)
     */
    function updateAlbumMetadata(
        uint256 albumId,
        string memory title,
        string memory description,
        string memory coverImageHash,
        string memory metadataURI
    ) public {
        require(albums[albumId].artist == msg.sender, "Not album owner");
        require(!albums[albumId].isPublished, "Album already published");
        
        if (bytes(title).length > 0) {
            albums[albumId].title = title;
        }
        if (bytes(description).length > 0) {
            albums[albumId].description = description;
        }
        if (bytes(coverImageHash).length > 0) {
            albums[albumId].coverImageHash = coverImageHash;
        }
        if (bytes(metadataURI).length > 0) {
            albums[albumId].metadataURI = metadataURI;
        }
    }
    
    /**
     * @dev Get album details
     */
    function getAlbum(uint256 albumId) public view returns (Album memory) {
        return albums[albumId];
    }
    
    /**
     * @dev Get all albums by artist
     */
    function getArtistAlbums(address artist) public view returns (uint256[] memory) {
        return artistAlbums[artist];
    }
    
    /**
     * @dev Get songs in album
     */
    function getAlbumSongs(uint256 albumId) public view returns (uint256[] memory) {
        return albums[albumId].songTokenIds;
    }
    
    /**
     * @dev Check if song is in any album
     */
    function isSongInAlbum(uint256 songTokenId) public view returns (bool) {
        return songInAlbum[songTokenId];
    }
    
    /**
     * @dev Get album type as string
     */
    function getAlbumTypeString(AlbumType albumType) public pure returns (string memory) {
        if (albumType == AlbumType.SINGLE) return "Single";
        if (albumType == AlbumType.EP) return "EP";
        return "Album";
    }
}
