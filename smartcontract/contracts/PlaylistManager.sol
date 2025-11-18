// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PlaylistManager is Ownable(msg.sender) {

    struct Playlist {
        uint256 id;
        address creator;
        string name;
        string description;
        string coverHash; // IPFS hash
        uint256[] songIds; // Array of song token IDs
        address[] collaborators; // Users who can edit
        bool isPublic;
        bool isDeleted;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 playCount;
        uint256 likeCount;
    }

    // State variables
    uint256 private _playlistIdCounter;

    mapping(uint256 => Playlist) public playlists;
    mapping(address => uint256[]) public userPlaylists; // user => playlistIds
    mapping(uint256 => mapping(address => bool)) public playlistLikes; // playlistId => user => liked
    mapping(uint256 => mapping(address => bool)) public playlistCollaborators; // playlistId => user => isCollaborator

    // Events
    event PlaylistCreated(uint256 indexed playlistId, address indexed creator, string name);
    event PlaylistUpdated(uint256 indexed playlistId);
    event SongAddedToPlaylist(uint256 indexed playlistId, uint256 indexed songId);
    event SongRemovedFromPlaylist(uint256 indexed playlistId, uint256 indexed songId);
    event PlaylistLiked(uint256 indexed playlistId, address indexed user);
    event PlaylistUnliked(uint256 indexed playlistId, address indexed user);
    event CollaboratorAdded(uint256 indexed playlistId, address indexed collaborator);
    event CollaboratorRemoved(uint256 indexed playlistId, address indexed collaborator);

    constructor() {}

    /**
     * @dev Create a new playlist
     */
    function createPlaylist(
        string memory name,
        string memory description,
        string memory coverHash,
        bool isPublic
    ) public returns (uint256) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(name).length <= 100, "Name too long");

        _playlistIdCounter++;
        uint256 playlistId = _playlistIdCounter;

        playlists[playlistId] = Playlist({
            id: playlistId,
            creator: msg.sender,
            name: name,
            description: description,
            coverHash: coverHash,
            songIds: new uint256[](0),
            collaborators: new address[](0),
            isPublic: isPublic,
            isDeleted: false,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            playCount: 0,
            likeCount: 0
        });

        userPlaylists[msg.sender].push(playlistId);

        emit PlaylistCreated(playlistId, msg.sender, name);

        return playlistId;
    }

    /**
     * @dev Update playlist metadata
     */
    function updatePlaylist(
        uint256 playlistId,
        string memory name,
        string memory description,
        string memory coverHash,
        bool isPublic
    ) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");
        require(
            playlist.creator == msg.sender || playlistCollaborators[playlistId][msg.sender],
            "Not authorized"
        );

        if (bytes(name).length > 0) {
            playlist.name = name;
        }
        if (bytes(description).length > 0) {
            playlist.description = description;
        }
        if (bytes(coverHash).length > 0) {
            playlist.coverHash = coverHash;
        }
        playlist.isPublic = isPublic;
        playlist.updatedAt = block.timestamp;

        emit PlaylistUpdated(playlistId);
    }

    /**
     * @dev Add song to playlist
     */
    function addSongToPlaylist(uint256 playlistId, uint256 songId) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");
        require(
            playlist.creator == msg.sender || playlistCollaborators[playlistId][msg.sender],
            "Not authorized"
        );

        // Check if song already exists in playlist
        for (uint i = 0; i < playlist.songIds.length; i++) {
            require(playlist.songIds[i] != songId, "Song already in playlist");
        }

        playlist.songIds.push(songId);
        playlist.updatedAt = block.timestamp;

        emit SongAddedToPlaylist(playlistId, songId);
    }

    /**
     * @dev Remove song from playlist
     */
    function removeSongFromPlaylist(uint256 playlistId, uint256 songId) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");
        require(
            playlist.creator == msg.sender || playlistCollaborators[playlistId][msg.sender],
            "Not authorized"
        );

        // Find and remove song
        for (uint i = 0; i < playlist.songIds.length; i++) {
            if (playlist.songIds[i] == songId) {
                playlist.songIds[i] = playlist.songIds[playlist.songIds.length - 1];
                playlist.songIds.pop();
                playlist.updatedAt = block.timestamp;

                emit SongRemovedFromPlaylist(playlistId, songId);
                return;
            }
        }

        revert("Song not in playlist");
    }

    /**
     * @dev Reorder songs in playlist
     */
    function reorderPlaylist(uint256 playlistId, uint256[] memory newOrder) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");
        require(
            playlist.creator == msg.sender || playlistCollaborators[playlistId][msg.sender],
            "Not authorized"
        );
        require(newOrder.length == playlist.songIds.length, "Invalid order length");

        // Verify all song IDs are present
        for (uint i = 0; i < newOrder.length; i++) {
            bool found = false;
            for (uint j = 0; j < playlist.songIds.length; j++) {
                if (playlist.songIds[j] == newOrder[i]) {
                    found = true;
                    break;
                }
            }
            require(found, "Invalid song ID in order");
        }

        playlist.songIds = newOrder;
        playlist.updatedAt = block.timestamp;

        emit PlaylistUpdated(playlistId);
    }

    /**
     * @dev Add collaborator to playlist
     */
    function addCollaborator(uint256 playlistId, address collaborator) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");
        require(playlist.creator == msg.sender, "Only creator can add collaborators");
        require(collaborator != address(0), "Invalid collaborator address");
        require(!playlistCollaborators[playlistId][collaborator], "Already a collaborator");

        playlistCollaborators[playlistId][collaborator] = true;
        playlist.collaborators.push(collaborator);

        emit CollaboratorAdded(playlistId, collaborator);
    }

    /**
     * @dev Remove collaborator from playlist
     */
    function removeCollaborator(uint256 playlistId, address collaborator) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");
        require(playlist.creator == msg.sender, "Only creator can remove collaborators");
        require(playlistCollaborators[playlistId][collaborator], "Not a collaborator");

        playlistCollaborators[playlistId][collaborator] = false;

        // Remove from collaborators array
        for (uint i = 0; i < playlist.collaborators.length; i++) {
            if (playlist.collaborators[i] == collaborator) {
                playlist.collaborators[i] = playlist.collaborators[playlist.collaborators.length - 1];
                playlist.collaborators.pop();
                break;
            }
        }

        emit CollaboratorRemoved(playlistId, collaborator);
    }

    /**
     * @dev Like a playlist
     */
    function likePlaylist(uint256 playlistId) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");
        require(playlist.isPublic, "Playlist is private");
        require(!playlistLikes[playlistId][msg.sender], "Already liked");

        playlistLikes[playlistId][msg.sender] = true;
        playlist.likeCount++;

        emit PlaylistLiked(playlistId, msg.sender);
    }

    /**
     * @dev Unlike a playlist
     */
    function unlikePlaylist(uint256 playlistId) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(playlistLikes[playlistId][msg.sender], "Not liked");

        playlistLikes[playlistId][msg.sender] = false;
        playlist.likeCount--;

        emit PlaylistUnliked(playlistId, msg.sender);
    }

    /**
     * @dev Record playlist play
     */
    function recordPlaylistPlay(uint256 playlistId) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(!playlist.isDeleted, "Playlist is deleted");

        playlist.playCount++;
    }

    /**
     * @dev Delete playlist
     */
    function deletePlaylist(uint256 playlistId) public {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.id != 0, "Playlist does not exist");
        require(playlist.creator == msg.sender, "Only creator can delete");
        require(!playlist.isDeleted, "Already deleted");

        playlist.isDeleted = true;

        emit PlaylistUpdated(playlistId);
    }

    /**
     * @dev Get playlist details
     */
    function getPlaylist(uint256 playlistId) public view returns (Playlist memory) {
        require(playlists[playlistId].id != 0, "Playlist does not exist");
        return playlists[playlistId];
    }

    /**
     * @dev Get user playlists
     */
    function getUserPlaylists(address user) public view returns (uint256[] memory) {
        return userPlaylists[user];
    }

    /**
     * @dev Get playlist collaborators
     */
    function getPlaylistCollaborators(uint256 playlistId) public view returns (address[] memory) {
        return playlists[playlistId].collaborators;
    }

    /**
     * @dev Check if user is collaborator
     */
    function isCollaborator(uint256 playlistId, address user) public view returns (bool) {
        return playlistCollaborators[playlistId][user];
    }

    /**
     * @dev Check if user liked playlist
     */
    function hasLikedPlaylist(uint256 playlistId, address user) public view returns (bool) {
        return playlistLikes[playlistId][user];
    }

    /**
     * @dev Get public playlists (for discovery)
     */
    function getPublicPlaylists(uint256 offset, uint256 limit) public view returns (uint256[] memory) {
        uint256 totalPlaylists = _playlistIdCounter;
        uint256 resultCount = 0;

        // First pass: count public playlists
        for (uint i = 1; i <= totalPlaylists; i++) {
            if (playlists[i].isPublic && !playlists[i].isDeleted) {
                resultCount++;
            }
        }

        // Calculate actual limit
        uint256 actualLimit = limit;
        if (offset + limit > resultCount) {
            actualLimit = resultCount - offset;
        }

        uint256[] memory result = new uint256[](actualLimit);
        uint256 resultIndex = 0;

        // Second pass: collect public playlists
        for (uint i = 1; i <= totalPlaylists && resultIndex < actualLimit; i++) {
            if (playlists[i].isPublic && !playlists[i].isDeleted) {
                if (offset > 0) {
                    offset--;
                } else {
                    result[resultIndex] = i;
                    resultIndex++;
                }
            }
        }

        return result;
    }
}

