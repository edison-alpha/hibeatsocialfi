const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HiBeats Contract Suite", function () {
  let songNFT;
  let socialGraph;
  let userProfile;
  let marketplace;
  let playlistManager;
  let tippingSystem;

  let owner;
  let artist;
  let buyer;
  let fan;

  beforeEach(async function () {
    [owner, artist, buyer, fan] = await ethers.getSigners();

    // Deploy all contracts
    const SongNFT = await ethers.getContractFactory("SongNFT");
    songNFT = await SongNFT.deploy();
    await songNFT.waitForDeployment();

    const SocialGraph = await ethers.getContractFactory("SocialGraph");
    socialGraph = await SocialGraph.deploy();
    await socialGraph.waitForDeployment();

    const UserProfile = await ethers.getContractFactory("UserProfile");
    userProfile = await UserProfile.deploy();
    await userProfile.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    const PlaylistManager = await ethers.getContractFactory("PlaylistManager");
    playlistManager = await PlaylistManager.deploy();
    await playlistManager.waitForDeployment();

    const TippingSystem = await ethers.getContractFactory("TippingSystem");
    tippingSystem = await TippingSystem.deploy();
    await tippingSystem.waitForDeployment();
  });

  describe("Integration Test: Complete User Journey", function () {
    it("Should allow a complete user journey: profile -> mint song -> post -> tip -> buy", async function () {
      // 1. Create user profile
      await userProfile.connect(artist).createProfile(
        "testartist",
        "Test Artist",
        "Electronic music producer",
        "QmAvatarHash",
        "Berlin",
        true
      );

      await userProfile.connect(fan).createProfile(
        "testfan",
        "Test Fan",
        "Music lover",
        "QmFanAvatar",
        "London",
        false
      );

      // 2. Mint a song
      const mintTx = await songNFT.connect(artist).mintSong(
        artist.address,
        "Test Track",
        "Test Artist",
        "Electronic",
        240, // 4 minutes
        "QmAudioHash",
        "QmArtworkHash",
        500, // 5% royalty
        false
      );

      await expect(mintTx)
        .to.emit(songNFT, "SongMinted")
        .withArgs(1, artist.address, "Test Track", "QmAudioHash");

      // 3. Fan likes the song
      await songNFT.connect(fan).likeSong(1);
      expect(await songNFT.hasLiked(1, fan.address)).to.equal(true);

      const metadata = await songNFT.getSongMetadata(1);
      expect(metadata.likeCount).to.equal(1);

      // 4. Record a play
      await songNFT.connect(fan).recordPlay(1);
      const updatedMetadata = await songNFT.getSongMetadata(1);
      expect(updatedMetadata.playCount).to.equal(1);

      // 5. Create a post about the song
      await socialGraph.connect(artist).createPost(
        "Just released my new track 'Test Track'! Check it out on HiBeats 🎵",
        "QmPostImage"
      );

      // 6. Fan follows artist
      await socialGraph.connect(fan).followUser(artist.address);
      expect(await socialGraph.isFollowing(fan.address, artist.address)).to.equal(true);

      // 7. Fan comments on post
      await socialGraph.connect(fan).createComment(1, "This is amazing! Can't wait to hear it 🔥");

      // 8. Fan tips the artist
      const tipAmount = ethers.parseEther("0.01");
      await tippingSystem.connect(fan).sendTip(artist.address, "Love your music!", 1, { value: tipAmount });

      // Check tip was recorded
      const userTips = await tippingSystem.getUserReceivedTips(artist.address);
      expect(userTips.length).to.equal(1);

      const totalTips = await tippingSystem.getTotalTipsReceived(artist.address);
      expect(totalTips).to.equal(tipAmount * 995n / 1000n); // After 0.5% platform fee

      // 9. Artist creates a playlist
      await playlistManager.connect(artist).createPlaylist(
        "My Hits",
        "My best tracks",
        "QmPlaylistCover",
        true
      );

      // Get the playlist ID from user's playlists
      const artistPlaylists = await playlistManager.getUserPlaylists(artist.address);
      const playlistId = artistPlaylists[artistPlaylists.length - 1];

      // 10. Add song to playlist
      await playlistManager.connect(artist).addSongToPlaylist(playlistId, 1);

      const playlist = await playlistManager.getPlaylist(playlistId);
      expect(playlist.songIds.length).to.equal(1);
      expect(playlist.songIds[0]).to.equal(1);

      // 11. Fan likes the playlist
      await playlistManager.connect(fan).likePlaylist(playlistId);
      const updatedPlaylist = await playlistManager.getPlaylist(playlistId);
      expect(updatedPlaylist.likeCount).to.equal(1);

      // 12. Artist lists song for sale
      // First approve marketplace
      await songNFT.connect(artist).approve(marketplace.target, 1);

      await marketplace.connect(artist).createListing(
        songNFT.target,
        1,
        ethers.parseEther("0.1")
      );

      // Get the listing ID from user's listings
      const artistListings = await marketplace.getUserListings(artist.address);
      const listingId = artistListings[artistListings.length - 1].id;

      // 13. Buyer purchases the song
      await marketplace.connect(buyer).buyListing(listingId, { value: ethers.parseEther("0.1") });

      // Verify ownership transfer
      expect(await songNFT.ownerOf(1)).to.equal(buyer.address);

      // 14. Buyer creates their own playlist
      await playlistManager.connect(buyer).createPlaylist(
        "My Collection",
        "Songs I bought",
        "",
        false
      );

      // Get the buyer playlist ID
      const buyerPlaylists = await playlistManager.getUserPlaylists(buyer.address);
      const buyerPlaylistId = buyerPlaylists[buyerPlaylists.length - 1];

      await playlistManager.connect(buyer).addSongToPlaylist(buyerPlaylistId, 1);

      console.log("✅ Complete user journey test passed!");
    });
  });

  describe("Contract Interactions", function () {
    beforeEach(async function () {
      // Create profiles
      await userProfile.connect(artist).createProfile("artist", "Artist", "Bio", "", "", true);
      await userProfile.connect(buyer).createProfile("buyer", "Buyer", "Bio", "", "", false);
    });

    it("Should handle song minting and marketplace flow", async function () {
      // Mint song
      await songNFT.connect(artist).mintSong(
        artist.address, "Song", "Artist", "Genre", 180, "audio", "artwork", 500, false
      );

      // Approve and list
      await songNFT.connect(artist).approve(marketplace.target, 1);
      await marketplace.connect(artist).createListing(
        songNFT.target, 1, ethers.parseEther("0.05")
      );

      // Get the listing ID from user's listings
      const artistListings = await marketplace.getUserListings(artist.address);
      const listingId = artistListings[artistListings.length - 1].id;

      // Buy
      await marketplace.connect(buyer).buyListing(listingId, { value: ethers.parseEther("0.05") });

      expect(await songNFT.ownerOf(1)).to.equal(buyer.address);
    });

    it("Should handle social interactions", async function () {
      // Create post
      await socialGraph.connect(artist).createPost("Hello world!", "");

      // Like and comment
      await socialGraph.connect(buyer).likePost(1);
      await socialGraph.connect(buyer).createComment(1, "Great post!");

      const post = await socialGraph.posts(1);
      expect(post.likeCount).to.equal(1);
      expect(post.commentCount).to.equal(1);
    });

    it("Should handle tipping", async function () {
      const tipAmount = ethers.parseEther("0.02");
      await tippingSystem.connect(buyer).sendTip(artist.address, "Support!", 0, { value: tipAmount });

      const totalReceived = await tippingSystem.getTotalTipsReceived(artist.address);
      expect(totalReceived).to.equal(tipAmount * 995n / 1000n);
    });
  });
});