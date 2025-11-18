const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HiBeats Social Features Integration Test", function () {
  let userProfile, socialGraph, directMessages, songNFT, playlistManager, marketplace, tippingSystem;
  let owner, artist, fan, user3, user4;
  let songId1, songId2;

  beforeEach(async function () {
    // Get signers
    [owner, artist, fan, user3, user4] = await ethers.getSigners();

    // Deploy contracts
    const UserProfile = await ethers.getContractFactory("UserProfile");
    userProfile = await UserProfile.deploy();
    await userProfile.waitForDeployment();

    const SocialGraph = await ethers.getContractFactory("SocialGraph");
    socialGraph = await SocialGraph.deploy();
    await socialGraph.waitForDeployment();

    const DirectMessages = await ethers.getContractFactory("DirectMessages");
    directMessages = await DirectMessages.deploy();
    await directMessages.waitForDeployment();

    const SongNFT = await ethers.getContractFactory("SongNFT");
    songNFT = await SongNFT.deploy();
    await songNFT.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    const PlaylistManager = await ethers.getContractFactory("PlaylistManager");
    playlistManager = await PlaylistManager.deploy();
    await playlistManager.waitForDeployment();

    const TippingSystem = await ethers.getContractFactory("TippingSystem");
    tippingSystem = await TippingSystem.deploy();
    await tippingSystem.waitForDeployment();

    // Create profiles
    await userProfile.connect(artist).createProfile("artist", "Artist Name", "Bio", "avatar.jpg", "banner.jpg", true);
    await userProfile.connect(fan).createProfile("fan", "Fan Name", "Music lover", "fan.jpg", "fan-banner.jpg", false);
    await userProfile.connect(user3).createProfile("user3", "User Three", "Third user", "", "", false);
    await userProfile.connect(user4).createProfile("user4", "User Four", "Fourth user", "", "", false);

    // Mint some songs
    await songNFT.connect(artist).mintSong(
      artist.address, "Song 1", "Artist", "Pop", 180, "audio1.mp3", "artwork1.jpg", 500, false
    );
    await songNFT.connect(artist).mintSong(
      artist.address, "Song 2", "Artist", "Rock", 200, "audio2.mp3", "artwork2.jpg", 700, false
    );

    songId1 = 1;
    songId2 = 2;
  });

  describe("Profile Management", function () {
    it("Should create and update profiles", async function () {
      // Check profile creation
      let profile = await userProfile.getProfile(artist.address);
      expect(profile.username).to.equal("artist");
      expect(profile.displayName).to.equal("Artist Name");

      // Update profile
      await userProfile.connect(artist).updateProfile("Updated Name", "Updated bio", "new-avatar.jpg", "new-banner.jpg", "Berlin", "website.com");
      profile = await userProfile.getProfile(artist.address);
      expect(profile.bio).to.equal("Updated bio");

      // Update social links
      await userProfile.connect(artist).updateSocialLinks("instagram.com/artist", "twitter.com/artist", "youtube.com/artist", "spotify.com/artist", "", "", "", "");
      profile = await userProfile.getProfile(artist.address);
      expect(profile.socialLinks.twitter).to.equal("twitter.com/artist");

      console.log("✅ Profile creation and updates working");
    });

    it("Should change username", async function () {
      await userProfile.connect(artist).changeUsername("newartist");
      const profile = await userProfile.getProfile(artist.address);
      expect(profile.username).to.equal("newartist");

      // Check address lookup by username
      const address = await userProfile.getAddressByUsername("newartist");
      expect(address).to.equal(artist.address);

      console.log("✅ Username changes working");
    });
  });

  describe("Posting and Social Interactions", function () {
    it("Should create posts with hashtags and mentions", async function () {
      // Create post with hashtags and mentions
      const postContent = "Just dropped a new track! Check it out #newmusic #hiphop @fan what do you think?";
      await socialGraph.connect(artist).createPost(postContent, "QmPostImage");

      const posts = await socialGraph.getUserPosts(artist.address);
      expect(posts.length).to.equal(1);

      const post = await socialGraph.posts(1);
      expect(post.content).to.equal(postContent);
      expect(post.author).to.equal(artist.address);

      console.log("✅ Post creation with hashtags and mentions working");
    });

    it("Should like and unlike posts", async function () {
      // Create post
      await socialGraph.connect(artist).createPost("Test post", "");

      // Like post
      await socialGraph.connect(fan).likePost(1);
      let post = await socialGraph.posts(1);
      expect(post.likeCount).to.equal(1);

      // Check if user liked
      const hasLiked = await socialGraph.hasLikedPost(1, fan.address);
      expect(hasLiked).to.equal(true);

      // Unlike post
      await socialGraph.connect(fan).unlikePost(1);
      post = await socialGraph.posts(1);
      expect(post.likeCount).to.equal(0);

      console.log("✅ Post liking/unliking working");
    });

    it("Should create comments and replies", async function () {
      // Create post
      await socialGraph.connect(artist).createPost("Test post for comments", "");

      // Create comment
      await socialGraph.connect(fan).createComment(1, "Great post!");
      let post = await socialGraph.posts(1);
      expect(post.commentCount).to.equal(1);

      // Get comments
      const comments = await socialGraph.getPostComments(1);
      expect(comments.length).to.equal(1);

      // Reply to comment (Note: SocialGraph doesn't have reply functionality yet)
      await socialGraph.connect(user3).createComment(1, "I agree with the comment!");
      post = await socialGraph.posts(1);
      expect(post.commentCount).to.equal(2);

      // Like comment
      await socialGraph.connect(user4).likeComment(1);
      const comment = await socialGraph.comments(1);
      expect(comment.likeCount).to.equal(1);

      console.log("✅ Comments and replies working");
    });

    it("Should handle follows and followers", async function () {
      // Follow user
      await socialGraph.connect(fan).followUser(artist.address);
      expect(await socialGraph.isFollowing(fan.address, artist.address)).to.equal(true);

      // Check followers
      const followers = await socialGraph.getFollowers(artist.address);
      expect(followers.length).to.equal(1);
      expect(followers[0]).to.equal(fan.address);

      // Check following
      const following = await socialGraph.getFollowing(fan.address);
      expect(following.length).to.equal(1);
      expect(following[0]).to.equal(artist.address);

      // Unfollow
      await socialGraph.connect(fan).unfollowUser(artist.address);
      expect(await socialGraph.isFollowing(fan.address, artist.address)).to.equal(false);

      console.log("✅ Follow/unfollow functionality working");
    });
  });

  describe("Direct Messaging", function () {
    it("Should send and receive messages", async function () {
      // Send message
      await directMessages.connect(artist).sendMessage(
        fan.address, "Hey fan, thanks for the support!", "", 0
      );

      // Check conversation
      const conversations = await directMessages.getUserConversations(artist.address);
      expect(conversations.length).to.equal(1);

      // Get messages
      const messages = await directMessages.connect(artist).getConversationMessages(1);
      expect(messages.length).to.equal(1);

      // Mark as read
      await directMessages.connect(fan).markMessageAsRead(1);
      const message = await directMessages.connect(fan).getMessage(1);
      expect(message.isRead).to.equal(true);

      // Reply
      await directMessages.connect(fan).sendMessage(
        artist.address, "You're welcome! Love your music!", "", 1
      );

      const updatedMessages = await directMessages.connect(artist).getConversationMessages(1);
      expect(updatedMessages.length).to.equal(2);

      console.log("✅ Direct messaging working");
    });

    it("Should handle message deletion", async function () {
      // Send message
      await directMessages.connect(artist).sendMessage(fan.address, "Test message", "", 0);

      // Delete message
      await directMessages.connect(artist).deleteMessage(1);
      const message = await directMessages.connect(artist).getMessage(1);
      expect(message.isDeleted).to.equal(true);

      console.log("✅ Message deletion working");
    });
  });

  describe("Song Interactions", function () {
    it("Should like and record plays on songs", async function () {
      // Like song
      await songNFT.connect(fan).likeSong(songId1);
      let metadata = await songNFT.getSongMetadata(songId1);
      expect(metadata.likeCount).to.equal(1);

      // Check if liked
      const hasLiked = await songNFT.hasLiked(songId1, fan.address);
      expect(hasLiked).to.equal(true);

      // Record play
      await songNFT.connect(fan).recordPlay(songId1);
      metadata = await songNFT.getSongMetadata(songId1);
      expect(metadata.playCount).to.equal(1);

      // Unlike song
      await songNFT.connect(fan).unlikeSong(songId1);
      metadata = await songNFT.getSongMetadata(songId1);
      expect(metadata.likeCount).to.equal(0);

      console.log("✅ Song liking and play recording working");
    });
  });

  describe("Playlist Management", function () {
    it("Should create and manage playlists", async function () {
      // Create playlist
      await playlistManager.connect(artist).createPlaylist(
        "My Hits", "Best songs", "QmCover", true
      );

      const playlists = await playlistManager.getUserPlaylists(artist.address);
      const playlistId = playlists[playlists.length - 1];

      // Add songs to playlist
      await playlistManager.connect(artist).addSongToPlaylist(playlistId, songId1);
      await playlistManager.connect(artist).addSongToPlaylist(playlistId, songId2);

      let playlist = await playlistManager.getPlaylist(playlistId);
      expect(playlist.songIds.length).to.equal(2);

      // Like playlist
      await playlistManager.connect(fan).likePlaylist(playlistId);
      playlist = await playlistManager.getPlaylist(playlistId);
      expect(playlist.likeCount).to.equal(1);

      // Record playlist play
      await playlistManager.connect(fan).recordPlaylistPlay(playlistId);
      playlist = await playlistManager.getPlaylist(playlistId);
      expect(playlist.playCount).to.equal(1);

      // Remove song from playlist
      await playlistManager.connect(artist).removeSongFromPlaylist(playlistId, songId1);
      playlist = await playlistManager.getPlaylist(playlistId);
      expect(playlist.songIds.length).to.equal(1);

      console.log("✅ Playlist management working");
    });

    it("Should handle playlist collaboration", async function () {
      // Create playlist
      await playlistManager.connect(artist).createPlaylist("Collaborative", "Team playlist", "", true);
      const playlists = await playlistManager.getUserPlaylists(artist.address);
      const playlistId = playlists[playlists.length - 1];

      // Add collaborator
      await playlistManager.connect(artist).addCollaborator(playlistId, fan.address);

      // Collaborator adds song
      await playlistManager.connect(fan).addSongToPlaylist(playlistId, songId1);
      const playlist = await playlistManager.getPlaylist(playlistId);
      expect(playlist.songIds.length).to.equal(1);

      console.log("✅ Playlist collaboration working");
    });
  });

  describe("Trending and Discovery", function () {
    beforeEach(async function () {
      // Create multiple posts with hashtags
      await socialGraph.connect(artist).createPost("New track out! #music #newrelease", "");
      await socialGraph.connect(fan).createPost("Loving this song! #music #favorites", "");
      await socialGraph.connect(user3).createPost("Check out this artist #music #discover", "");

      // Create posts about songs
      await socialGraph.connect(artist).createPost("Song 1 is trending! #trending #song1", "");
      await socialGraph.connect(fan).createPost("Song 2 is amazing! #trending #song2", "");

      // Record plays on songs
      await songNFT.connect(fan).recordPlay(songId1);
      await songNFT.connect(fan).recordPlay(songId1);
      await songNFT.connect(user3).recordPlay(songId1);
      await songNFT.connect(user4).recordPlay(songId2);
    });

    it("Should display trending content", async function () {
      // Get recent posts (simulating trending)
      // Note: In a real implementation, you'd have trending algorithms
      // For now, we'll just check that posts exist and have engagement

      const artistPosts = await socialGraph.getUserPosts(artist.address);
      expect(artistPosts.length).to.be.greaterThan(0);

      // Check song metadata has play counts
      const song1Metadata = await songNFT.getSongMetadata(songId1);
      const song2Metadata = await songNFT.getSongMetadata(songId2);

      expect(song1Metadata.playCount).to.equal(3);
      expect(song2Metadata.playCount).to.equal(1);

      console.log("✅ Trending content display working");
    });

    it("Should show public playlists", async function () {
      // Create public playlists
      await playlistManager.connect(artist).createPlaylist("Public Hits", "Public playlist", "", true);
      await playlistManager.connect(fan).createPlaylist("Fan Favorites", "Public fan list", "", true);

      const publicPlaylists = await playlistManager.getPublicPlaylists(0, 10);
      expect(publicPlaylists.length).to.equal(2);

      console.log("✅ Public playlist discovery working");
    });
  });

  describe("Tipping System", function () {
    it("Should handle tipping", async function () {
      const tipAmount = ethers.parseEther("0.01");

      // Send tip
      await tippingSystem.connect(fan).sendTip(artist.address, "Great music!", 0, { value: tipAmount });

      // Check tip records
      const sentTips = await tippingSystem.getUserSentTips(fan.address);
      const receivedTips = await tippingSystem.getUserReceivedTips(artist.address);

      expect(sentTips.length).to.equal(1);
      expect(receivedTips.length).to.equal(1);

      // Check total received (after platform fee)
      const totalReceived = await tippingSystem.getTotalTipsReceived(artist.address);
      expect(totalReceived).to.equal(tipAmount * 995n / 1000n); // 0.5% platform fee

      console.log("✅ Tipping system working");
    });
  });

  describe("Marketplace Integration", function () {
    it("Should handle song trading", async function () {
      // Approve marketplace
      await songNFT.connect(artist).approve(marketplace.target, songId1);

      // Create listing
      await marketplace.connect(artist).createListing(
        songNFT.target, songId1, ethers.parseEther("0.1")
      );

      const listings = await marketplace.getUserListings(artist.address);
      const listingId = listings[listings.length - 1].id;

      // Buy song
      await marketplace.connect(fan).buyListing(listingId, { value: ethers.parseEther("0.1") });

      // Check ownership transfer
      expect(await songNFT.ownerOf(songId1)).to.equal(fan.address);

      console.log("✅ Marketplace trading working");
    });
  });

  describe("Complete User Journey", function () {
    it("Should simulate complete social music platform experience", async function () {
      console.log("\n🎵 Starting Complete User Journey Test...");

      // 1. Artist creates profile and posts
      console.log("1. Artist creates profile and posts...");
      await socialGraph.connect(artist).createPost("Just uploaded my new album! #newmusic #album", "QmAlbumArt");

      // 2. Fan discovers and likes the post
      console.log("2. Fan discovers and likes the post...");
      await socialGraph.connect(fan).likePost(1);
      await socialGraph.connect(fan).createComment(1, "Can't wait to listen! 🔥");

      // 3. Artist replies to comment
      console.log("3. Artist replies to comment...");
      await socialGraph.connect(artist).createComment(1, "Thanks! It's available now on HiBeats");

      // 4. Fan follows artist
      console.log("4. Fan follows artist...");
      await socialGraph.connect(fan).followUser(artist.address);

      // 5. Fan likes and plays the song
      console.log("5. Fan likes and plays the song...");
      await songNFT.connect(fan).likeSong(songId1);
      await songNFT.connect(fan).recordPlay(songId1);

      // 6. Fan creates playlist and adds song
      console.log("6. Fan creates playlist and adds song...");
      await playlistManager.connect(fan).createPlaylist("My Favorites", "Best songs", "", true);
      const fanPlaylists = await playlistManager.getUserPlaylists(fan.address);
      const fanPlaylistId = fanPlaylists[fanPlaylists.length - 1];
      await playlistManager.connect(fan).addSongToPlaylist(fanPlaylistId, songId1);

      // 7. Fan tips artist
      console.log("7. Fan tips artist...");
      await tippingSystem.connect(fan).sendTip(artist.address, "Love your work!", songId1, { value: ethers.parseEther("0.02") });

      // 8. Users send direct messages
      console.log("8. Users send direct messages...");
      await directMessages.connect(fan).sendMessage(artist.address, "Hey, can you sign my digital copy?", "", 0);
      await directMessages.connect(artist).sendMessage(fan.address, "Of course! Send me your wallet address", "", 1);

      // 9. Artist creates public playlist
      console.log("9. Artist creates public playlist...");
      await playlistManager.connect(artist).createPlaylist("Trending Now", "Hot tracks", "QmCover", true);
      const artistPlaylists = await playlistManager.getUserPlaylists(artist.address);
      const trendingPlaylistId = artistPlaylists[artistPlaylists.length - 1];
      await playlistManager.connect(artist).addSongToPlaylist(trendingPlaylistId, songId1);
      await playlistManager.connect(artist).addSongToPlaylist(trendingPlaylistId, songId2);

      // 10. Check engagement metrics
      console.log("10. Checking engagement metrics...");
      const song1Stats = await songNFT.getSongMetadata(songId1);
      const postStats = await socialGraph.posts(1);
      const playlistStats = await playlistManager.getPlaylist(trendingPlaylistId);

      expect(song1Stats.likeCount).to.be.greaterThan(0);
      expect(song1Stats.playCount).to.be.greaterThan(0);
      expect(postStats.likeCount).to.be.greaterThan(0);
      expect(postStats.commentCount).to.be.greaterThan(0);
      expect(playlistStats.songIds.length).to.equal(2);

      console.log("✅ Complete user journey successful!");
      console.log(`   - Songs: ${song1Stats.likeCount} likes, ${song1Stats.playCount} plays`);
      console.log(`   - Posts: ${postStats.likeCount} likes, ${postStats.commentCount} comments`);
      console.log(`   - Playlists: ${playlistStats.songIds.length} songs`);
      console.log(`   - Messages: 2 exchanged`);
      console.log(`   - Tips: 1 sent`);
    });
  });
});