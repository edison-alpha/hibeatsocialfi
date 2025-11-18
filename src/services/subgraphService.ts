import { gql } from '@apollo/client/core';
import { apolloClient } from '../lib/apollo-client';

// ============================================================
// SUBGRAPH SERVICE - NFT & TRADING DATA ONLY
// ============================================================
// NOTE: Social features (posts, likes, comments, follows) have been migrated to Datastream (EAS)
// This service now only handles:
// - NFT Collections & Marketplace
// - Song/Album/Playlist NFTs
// - User NFT Stats & Trading History
// - Tipping (on-chain only)
//
// DEPRECATED: Social graph queries below are kept for reference but NOT USED
// Use somniaDatastreamService.v3 for all social features
// ============================================================

// ============================================================
// POST QUERIES (DEPRECATED - Use Datastream V3)
// ============================================================

const GET_POSTS = gql`
  query GetPosts($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String, $userId: ID) {
    posts(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: { isDeleted: false }
    ) {
      id
      author {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      content
      contentType
      ipfsHash
      timestamp
      likes
      comments
      shares
      isDeleted
      isPinned
      
      # NFT fields
      nftTokenId
      nftContractAddress
      nftPrice
      nftIsListed
      
      blockNumber
      transactionHash
      likedBy(first: 1000) {
        user {
          id
        }
      }
      repostedBy(first: 1000) {
        user {
          id
        }
      }
      postComments(first: 10, orderBy: timestamp, orderDirection: desc, where: { isDeleted: false }) {
        id
        author {
          id
          username
          displayName
          avatarHash
        }
        content
        timestamp
        isDeleted
      }
    }
  }
`;

// ============================================================
// NFT MARKETPLACE QUERIES
// ============================================================

const GET_NFT_COLLECTIONS = gql`
  query GetNFTCollections($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    nftCollections(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      name
      symbol
      contractAddress
      description
      coverImageHash
      bannerImageHash
      creator {
        id
        username
        displayName
        avatarHash
      }
      totalSupply
      floorPrice
      totalVolume
      listedCount
      ownerCount
      isVerified
      royaltyPercentage
      createdAt
      updatedAt
    }
  }
`;

const GET_NFT_COLLECTION = gql`
  query GetNFTCollection($id: ID!) {
    nftCollection(id: $id) {
      id
      name
      symbol
      contractAddress
      description
      coverImageHash
      bannerImageHash
      creator {
        id
        username
        displayName
        avatarHash
        isVerified
      }
      totalSupply
      floorPrice
      totalVolume
      listedCount
      ownerCount
      isVerified
      royaltyPercentage
      createdAt
      updatedAt
      items(first: 100, where: { isListed: true }, orderBy: currentPrice, orderDirection: asc) {
        id
        tokenId
        name
        imageHash
        owner {
          id
          username
        }
        currentPrice
        isListed
      }
    }
  }
`;

const GET_NFT_ITEMS = gql`
  query GetNFTItems($first: Int!, $skip: Int!, $where: NFTItem_filter) {
    nftItems(
      first: $first
      skip: $skip
      where: $where
      orderBy: mintedAt
      orderDirection: desc
    ) {
      id
      tokenId
      name
      description
      imageHash
      animationHash
      metadataURI
      owner {
        id
        username
        displayName
        avatarHash
      }
      creator {
        id
        username
        displayName
      }
      collection {
        id
        name
        contractAddress
      }
      lastSalePrice
      currentPrice
      isListed
      isFrozen
      mintedAt
      updatedAt
    }
  }
`;

const GET_NFT_ITEM = gql`
  query GetNFTItem($id: ID!) {
    nftItem(id: $id) {
      id
      tokenId
      name
      description
      imageHash
      animationHash
      metadataURI
      owner {
        id
        username
        displayName
        avatarHash
        isVerified
      }
      creator {
        id
        username
        displayName
        avatarHash
      }
      collection {
        id
        name
        symbol
        contractAddress
        royaltyPercentage
      }
      lastSalePrice
      currentPrice
      isListed
      isFrozen
      attributes {
        traitType
        value
        displayType
      }
      listings(first: 10, where: { isActive: true }, orderBy: price, orderDirection: asc) {
        id
        seller {
          username
        }
        price
        currency
        startTime
        endTime
      }
      offers(first: 10, where: { isActive: true }, orderBy: price, orderDirection: desc) {
        id
        offerer {
          username
        }
        price
        currency
        expiresAt
      }
      sales(first: 10, orderBy: timestamp, orderDirection: desc) {
        id
        seller {
          username
        }
        buyer {
          username
        }
        price
        timestamp
      }
      mintedAt
      updatedAt
      blockNumber
      transactionHash
    }
  }
`;

const GET_NFT_LISTINGS = gql`
  query GetNFTListings($first: Int!, $skip: Int!, $where: NFTListing_filter) {
    nftListings(
      first: $first
      skip: $skip
      where: $where
      orderBy: listedAt
      orderDirection: desc
    ) {
      id
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
      }
      seller {
        id
        username
        displayName
        avatarHash
      }
      price
      currency
      startTime
      endTime
      isActive
      listedAt
    }
  }
`;

const GET_NFT_ACTIVITY = gql`
  query GetNFTActivity($first: Int!, $skip: Int!, $where: NFTActivity_filter) {
    nftActivities(
      first: $first
      skip: $skip
      where: $where
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      activityType
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
        }
      }
      from {
        id
        username
        displayName
      }
      to {
        id
        username
        displayName
      }
      price
      currency
      timestamp
      transactionHash
    }
  }
`;

const GET_USER_NFT_STATS = gql`
  query GetUserNFTStats($userId: ID!) {
    userNFTStats(id: $userId) {
      id
      user {
        id
        username
        displayName
      }
      itemsOwned
      itemsCreated
      collectionsOwned
      itemsSold
      itemsBought
      totalSalesVolume
      totalPurchaseVolume
      activeListings
      totalListings
      activeOffers
      totalOffers
      offersReceived
      lastUpdated
    }
  }
`;

const GET_COLLECTION_DAILY_STATS = gql`
  query GetCollectionDailyStats($collectionId: ID!, $first: Int!) {
    collectionDailyStats(
      where: { collection: $collectionId }
      first: $first
      orderBy: date
      orderDirection: desc
    ) {
      id
      date
      volumeETH
      volumeUSD
      salesCount
      averagePrice
      newListings
      cancelledListings
      uniqueBuyers
      uniqueSellers
      floorPrice
    }
  }
`;

const GET_GLOBAL_MARKETPLACE_STATS = gql`
  query GetGlobalMarketplaceStats {
    globalMarketplaceStats(id: "global") {
      id
      totalNFTs
      totalCollections
      totalOwners
      totalVolume
      totalSales
      activeListings
      activeOffers
      totalPlatformFees
      totalRoyaltiesPaid
      lastUpdated
    }
  }
`;

const SEARCH_NFT_ITEMS = gql`
  query SearchNFTItems($searchTerm: String!, $first: Int!) {
    nftItems(
      where: { name_contains: $searchTerm }
      first: $first
      orderBy: mintedAt
      orderDirection: desc
    ) {
      id
      tokenId
      name
      imageHash
      owner {
        username
      }
      collection {
        name
      }
      currentPrice
      isListed
    }
  }
`;

const GET_TRENDING_NFT_COLLECTIONS = gql`
  query GetTrendingNFTCollections($first: Int!) {
    nftCollections(
      first: $first
      orderBy: totalVolume
      orderDirection: desc
    ) {
      id
      name
      contractAddress
      coverImageHash
      totalVolume
      floorPrice
      listedCount
      isVerified
    }
  }
`;

// ============================================================
// USER HISTORY QUERIES
// ============================================================

// Get user's owned NFTs
const GET_USER_OWNED_NFTS = gql`
  query GetUserOwnedNFTs($userId: ID!, $first: Int!, $skip: Int!) {
    nftitems(
      where: { owner: $userId }
      first: $first
      skip: $skip
      orderBy: mintedAt
      orderDirection: desc
    ) {
      id
      tokenId
      name
      description
      imageHash
      animationHash
      collection {
        id
        name
        symbol
        contractAddress
        royaltyPercentage
      }
      creator {
        id
        username
        displayName
      }
      currentPrice
      lastSalePrice
      isListed
      mintedAt
      updatedAt
    }
  }
`;

// Get user's created/minted NFTs
const GET_USER_CREATED_NFTS = gql`
  query GetUserCreatedNFTs($userId: ID!, $first: Int!, $skip: Int!) {
    nftitems(
      where: { creator: $userId }
      first: $first
      skip: $skip
      orderBy: mintedAt
      orderDirection: desc
    ) {
      id
      tokenId
      name
      description
      imageHash
      collection {
        id
        name
        contractAddress
      }
      owner {
        id
        username
        displayName
        avatarHash
      }
      creator {
        id
        username
        displayName
      }
      currentPrice
      lastSalePrice
      isListed
      mintedAt
    }
  }
`;

// Get user's NFT purchase history
const GET_USER_NFT_PURCHASES = gql`
  query GetUserNFTPurchases($userId: ID!, $first: Int!, $skip: Int!) {
    nftsales(
      where: { buyer: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
      }
      seller {
        id
        username
        displayName
        avatarHash
      }
      price
      currency
      platformFee
      royaltyFee
      sellerProceeds
      saleType
      timestamp
      transactionHash
    }
  }
`;

// Get user's NFT sales history
const GET_USER_NFT_SALES = gql`
  query GetUserNFTSales($userId: ID!, $first: Int!, $skip: Int!) {
    nftsales(
      where: { seller: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
      }
      buyer {
        id
        username
        displayName
        avatarHash
      }
      price
      currency
      platformFee
      royaltyFee
      sellerProceeds
      saleType
      timestamp
      transactionHash
    }
  }
`;

// Get user's active NFT listings
const GET_USER_NFT_LISTINGS = gql`
  query GetUserNFTListings($userId: ID!, $isActive: Boolean, $first: Int!, $skip: Int!) {
    nftlistings(
      where: { seller: $userId, isActive: $isActive }
      first: $first
      skip: $skip
      orderBy: listedAt
      orderDirection: desc
    ) {
      id
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
      }
      price
      currency
      startTime
      endTime
      isActive
      listedAt
      soldAt
      cancelledAt
      buyer {
        id
        username
      }
    }
  }
`;

// Get user's NFT offers made
const GET_USER_NFT_OFFERS_MADE = gql`
  query GetUserNFTOffersMade($userId: ID!, $first: Int!, $skip: Int!) {
    nftoffers(
      where: { offerer: $userId }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
        owner {
          id
          username
          displayName
        }
      }
      price
      currency
      isActive
      isAccepted
      isCancelled
      expiresAt
      createdAt
      acceptedAt
      cancelledAt
    }
  }
`;

// Get user's NFT offers received
const GET_USER_NFT_OFFERS_RECEIVED = gql`
  query GetUserNFTOffersReceived($userId: ID!, $first: Int!, $skip: Int!) {
    nftoffers(
      where: { item_: { owner: $userId } }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
      }
      offerer {
        id
        username
        displayName
        avatarHash
      }
      price
      currency
      isActive
      isAccepted
      isCancelled
      expiresAt
      createdAt
      acceptedAt
      cancelledAt
    }
  }
`;

// Get user's NFT transfer history
const GET_USER_NFT_TRANSFERS = gql`
  query GetUserNFTTransfers($userId: ID!, $first: Int!, $skip: Int!) {
    nfttransfers(
      where: { or: [{ from: $userId }, { to: $userId }] }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
      }
      from {
        id
        username
        displayName
      }
      to {
        id
        username
        displayName
      }
      transferType
      timestamp
      transactionHash
    }
  }
`;

// Get user's complete NFT activity feed
const GET_USER_NFT_ACTIVITY = gql`
  query GetUserNFTActivity($userId: ID!, $first: Int!, $skip: Int!) {
    nftactivities(
      where: { or: [{ from: $userId }, { to: $userId }] }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      activityType
      item {
        id
        tokenId
        name
        imageHash
        collection {
          name
          contractAddress
        }
      }
      from {
        id
        username
        displayName
        avatarHash
      }
      to {
        id
        username
        displayName
        avatarHash
      }
      price
      currency
      timestamp
      transactionHash
    }
  }
`;

// Get user's post history (already exists but ensuring it's here)
const GET_USER_POST_HISTORY = gql`
  query GetUserPostHistory($userId: ID!, $first: Int!, $skip: Int!) {
    posts(
      where: { author: $userId, isDeleted: false }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      content
      contentType
      ipfsHash
      timestamp
      likes
      comments
      shares
      isPinned
      nftTokenId
      nftContractAddress
      nftPrice
      nftIsListed
      blockNumber
      transactionHash
    }
  }
`;

// Get user's liked posts
const GET_USER_LIKED_POSTS = gql`
  query GetUserLikedPosts($userId: ID!, $first: Int!, $skip: Int!) {
    likes(
      where: { user: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      post {
        id
        author {
          id
          username
          displayName
          avatarHash
          isVerified
          isArtist
        }
        content
        contentType
        ipfsHash
        timestamp
        likes
        comments
        shares
      }
      timestamp
    }
  }
`;

// Get user's comment history
const GET_USER_COMMENT_HISTORY = gql`
  query GetUserCommentHistory($userId: ID!, $first: Int!, $skip: Int!) {
    comments(
      where: { author: $userId, isDeleted: false }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      post {
        id
        author {
          id
          username
          displayName
        }
        content
        timestamp
      }
      content
      timestamp
      transactionHash
    }
  }
`;

// Get user's repost history
const GET_USER_REPOST_HISTORY = gql`
  query GetUserRepostHistory($userId: ID!, $first: Int!, $skip: Int!) {
    reposts(
      where: { user: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      post {
        id
        author {
          id
          username
          displayName
          avatarHash
        }
        content
        contentType
        ipfsHash
        timestamp
        likes
        comments
        shares
      }
      comment
      timestamp
      transactionHash
    }
  }
`;

// Get user's following history
const GET_USER_FOLLOWING_HISTORY = gql`
  query GetUserFollowingHistory($userId: ID!, $first: Int!, $skip: Int!) {
    follows(
      where: { follower: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      following {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
        followerCount
        bio
      }
      timestamp
      transactionHash
    }
  }
`;

// Get user's followers history
const GET_USER_FOLLOWERS_HISTORY = gql`
  query GetUserFollowersHistory($userId: ID!, $first: Int!, $skip: Int!) {
    follows(
      where: { following: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      follower {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
        followerCount
        bio
      }
      timestamp
      transactionHash
    }
  }
`;

// Get user's song minting history
const GET_USER_MINTED_SONGS = gql`
  query GetUserMintedSongs($userId: ID!, $first: Int!, $skip: Int!) {
    songs(
      where: { artist: $userId }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      title
      description
      genre
      audioHash
      coverHash
      duration
      price
      royaltyPercentage
      playCount
      likeCount
      createdAt
      isListed
      owner {
        id
        username
        displayName
      }
    }
  }
`;

// Get user's song purchase history
const GET_USER_SONG_PURCHASES = gql`
  query GetUserSongPurchases($userId: ID!, $first: Int!, $skip: Int!) {
    songSales(
      where: { buyer: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      song {
        id
        tokenId
        title
        coverHash
        audioHash
        artist {
          id
          username
          displayName
        }
      }
      seller {
        id
        username
        displayName
        avatarHash
      }
      price
      royaltyPaid
      timestamp
      transactionHash
    }
  }
`;

// Get user's song sales history
const GET_USER_SONG_SALES = gql`
  query GetUserSongSales($userId: ID!, $first: Int!, $skip: Int!) {
    songSales(
      where: { seller: $userId }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      song {
        id
        tokenId
        title
        coverHash
        audioHash
      }
      buyer {
        id
        username
        displayName
        avatarHash
      }
      price
      royaltyPaid
      timestamp
      transactionHash
    }
  }
`;

// Get user's playlist history
const GET_USER_PLAYLIST_HISTORY = gql`
  query GetUserPlaylistHistory($userId: ID!, $first: Int!, $skip: Int!) {
    playlists(
      where: { owner: $userId }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      name
      description
      coverHash
      isPublic
      songCount
      createdAt
      updatedAt
      songs(first: 5) {
        song {
          id
          title
          coverHash
          artist {
            username
          }
        }
      }
    }
  }
`;

// Get user's album history
const GET_USER_ALBUM_HISTORY = gql`
  query GetUserAlbumHistory($userId: ID!, $first: Int!, $skip: Int!) {
    albums(
      where: { artist: $userId }
      first: $first
      skip: $skip
      orderBy: releaseDate
      orderDirection: desc
    ) {
      id
      title
      description
      coverHash
      albumType
      totalTracks
      releaseDate
      createdAt
      songs(first: 10) {
        song {
          id
          tokenId
          title
          duration
          coverHash
        }
        position
      }
    }
  }
`;

// Get user's comprehensive activity feed (all activities combined)
const GET_USER_ALL_ACTIVITY = gql`
  query GetUserAllActivity($userId: ID!, $first: Int!) {
    # Posts
    posts(where: { author: $userId, isDeleted: false }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      content
      contentType
      timestamp
      likes
      comments
      shares
    }
    # Likes
    likes(where: { user: $userId }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      post {
        id
        content
      }
      timestamp
    }
    # Comments
    comments(where: { author: $userId, isDeleted: false }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      content
      timestamp
    }
    # NFT Activities
    nftactivities(where: { or: [{ from: $userId }, { to: $userId }] }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      activityType
      timestamp
    }
    # Song Sales
    songSales(where: { or: [{ buyer: $userId }, { seller: $userId }] }, first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      price
      timestamp
    }
  }
`;

const GET_POST_BY_ID = gql`
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      author {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      content
      contentType
      ipfsHash
      timestamp
      likes
      comments
      shares
      isDeleted
      isPinned
      blockNumber
      transactionHash
      postComments(orderBy: timestamp, orderDirection: desc, where: { isDeleted: false }) {
        id
        author {
          id
          username
          displayName
          avatarHash
        }
        content
        timestamp
        isDeleted
      }
      likedBy(first: 100) {
        user {
          id
          username
        }
        timestamp
      }
    }
  }
`;

const GET_USER_POSTS = gql`
  query GetUserPosts($userId: ID!, $first: Int!, $skip: Int!) {
    posts(
      where: { author: $userId, isDeleted: false }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      content
      contentType
      ipfsHash
      timestamp
      likes
      comments
      shares
      isPinned
      postComments(first: 3, orderBy: timestamp, orderDirection: desc, where: { isDeleted: false }) {
        id
        author {
          id
          username
          displayName
        }
        content
        timestamp
      }
    }
  }
`;

const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: ID!, $first: Int!, $skip: Int!) {
    comments(
      where: { post: $postId, isDeleted: false }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      author {
        id
        username
        displayName
        avatarHash
      }
      content
      timestamp
      isDeleted
    }
  }
`;

// ============================================================
// SONG/BEATS QUERIES
// ============================================================

const GET_ALL_SONGS = gql`
  query GetAllSongs($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    songs(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      tokenId
      title
      description
      genre
      audioHash
      coverHash
      duration
      price
      royaltyPercentage
      createdAt
      isListed
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      owner {
        id
        username
        displayName
      }
      blockNumber
      transactionHash
    }
  }
`;

const GET_SONG_BY_ID = gql`
  query GetSong($id: ID!) {
    song(id: $id) {
      id
      tokenId
      title
      description
      genre
      audioHash
      coverHash
      duration
      price
      royaltyPercentage
      createdAt
      isListed
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
        followerCount
      }
      owner {
        id
        username
        displayName
        avatarHash
      }
      albums {
        album {
          id
          title
          coverImageHash
        }
      }
      playlists {
        playlist {
          id
          name
          coverHash
        }
      }
      sales(first: 10, orderBy: timestamp, orderDirection: desc) {
        id
        buyer {
          id
          username
        }
        price
        timestamp
      }
      blockNumber
      transactionHash
    }
  }
`;

const GET_TRENDING_SONGS = gql`
  query GetTrendingSongs($first: Int!) {
    songs(
      first: $first
      orderBy: playCount
      orderDirection: desc
      where: { isListed: true }
    ) {
      id
      tokenId
      title
      genre
      audioHash
      coverHash
      duration
      price
      playCount
      likeCount
      createdAt
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
    }
  }
`;

const GET_SONGS_BY_GENRE = gql`
  query GetSongsByGenre($genre: String!, $first: Int!, $skip: Int!) {
    songs(
      where: { genre: $genre, isListed: true }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      title
      genre
      audioHash
      coverHash
      duration
      price
      playCount
      likeCount
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
      }
    }
  }
`;

const GET_USER_SONGS = gql`
  query GetUserSongs($artistId: ID!, $first: Int!, $skip: Int!) {
    songs(
      where: { artist: $artistId }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      title
      genre
      audioHash
      coverHash
      duration
      price
      playCount
      likeCount
      createdAt
      isListed
    }
  }
`;

const GET_USER_OWNED_SONGS = gql`
  query GetUserOwnedSongs($ownerId: ID!, $first: Int!, $skip: Int!) {
    songs(
      where: { owner: $ownerId }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      tokenId
      title
      description
      genre
      audioHash
      coverHash
      duration
      price
      royaltyPercentage
      createdAt
      isListed
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      owner {
        id
        username
        displayName
      }
      albums {
        album {
          id
          title
          coverImageHash
        }
      }
      blockNumber
      transactionHash
    }
  }
`;

const SEARCH_SONGS = gql`
  query SearchSongs($searchTerm: String!, $first: Int!) {
    songs(
      where: { title_contains: $searchTerm }
      first: $first
      orderBy: playCount
      orderDirection: desc
    ) {
      id
      tokenId
      title
      genre
      audioHash
      coverHash
      duration
      price
      artist {
        id
        username
        displayName
        avatarHash
      }
    }
  }
`;

// ============================================================
// PLAYLIST QUERIES
// ============================================================

const GET_ALL_PLAYLISTS = gql`
  query GetAllPlaylists($first: Int!, $skip: Int!) {
    playlists(
      first: $first
      skip: $skip
      orderBy: updatedAt
      orderDirection: desc
      where: { isPublic: true }
    ) {
      id
      name
      description
      coverHash
      isPublic
      songCount
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarHash
      }
      songs(first: 4) {
        song {
          id
          title
          coverHash
          artist {
            username
          }
        }
      }
    }
  }
`;

const GET_PLAYLIST_BY_ID = gql`
  query GetPlaylist($id: ID!) {
    playlist(id: $id) {
      id
      name
      description
      coverHash
      isPublic
      songCount
      createdAt
      updatedAt
      owner {
        id
        username
        displayName
        avatarHash
        isVerified
      }
      songs(orderBy: position, orderDirection: asc) {
        id
        position
        addedAt
        addedBy {
          id
          username
        }
        song {
          id
          tokenId
          title
          genre
          audioHash
          coverHash
          duration
          price
          artist {
            id
            username
            displayName
            avatarHash
          }
        }
      }
      blockNumber
      transactionHash
    }
  }
`;

const GET_USER_PLAYLISTS = gql`
  query GetUserPlaylists($userId: ID!, $first: Int!, $skip: Int!) {
    playlists(
      where: { owner: $userId }
      first: $first
      skip: $skip
      orderBy: updatedAt
      orderDirection: desc
    ) {
      id
      name
      description
      coverHash
      isPublic
      songCount
      createdAt
      updatedAt
      songs(first: 4) {
        song {
          id
          title
          coverHash
        }
      }
    }
  }
`;

// ============================================================
// ALBUM QUERIES
// ============================================================

const GET_ALL_ALBUMS = gql`
  query GetAllAlbums($first: Int!, $skip: Int!) {
    albums(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
      where: { isPublished: true }
    ) {
      id
      albumId
      title
      description
      coverImageHash
      albumType
      songCount
      createdAt
      releaseDate
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      songs(first: 10, orderBy: position) {
        song {
          id
          title
          duration
          coverHash
        }
      }
    }
  }
`;

const GET_ALBUM_BY_ID = gql`
  query GetAlbum($id: ID!) {
    album(id: $id) {
      id
      albumId
      title
      description
      coverImageHash
      albumType
      songCount
      createdAt
      releaseDate
      isPublished
      metadataURI
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
        followerCount
      }
      songs(orderBy: position, orderDirection: asc) {
        id
        position
        addedAt
        song {
          id
          tokenId
          title
          genre
          audioHash
          coverHash
          duration
          price
          playCount
          likeCount
        }
      }
      blockNumber
      transactionHash
    }
  }
`;

const GET_USER_ALBUMS = gql`
  query GetUserAlbums($artistId: ID!, $first: Int!, $skip: Int!) {
    albums(
      where: { artist_: { id: $artistId } }
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      albumId
      title
      coverImageHash
      albumType
      songCount
      createdAt
      releaseDate
      isPublished
      artist {
        id
        username
        displayName
      }
    }
  }
`;

// ============================================================
// EXPLORE/DISCOVERY QUERIES
// ============================================================

const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      id
      totalUsers
      totalPosts
      totalLikes
      totalComments
      totalFollows
      totalSongs
      totalPlaylists
      totalMessages
      totalTips
      totalSales
      lastUpdated
    }
  }
`;

const GET_TRENDING_ARTISTS = gql`
  query GetTrendingArtists($first: Int!) {
    userProfiles(
      where: { isArtist: true }
      first: $first
      orderBy: followerCount
      orderDirection: desc
    ) {
      id
      username
      displayName
      bio
      avatarHash
      isVerified
      isArtist
      followerCount
      followingCount
      postCount
      songs(first: 3, orderBy: playCount, orderDirection: desc) {
        id
        title
        coverHash
        playCount
      }
    }
  }
`;

const GET_NEW_RELEASES = gql`
  query GetNewReleases($first: Int!) {
    songs(
      first: $first
      orderBy: createdAt
      orderDirection: desc
      where: { isListed: true }
    ) {
      id
      tokenId
      title
      genre
      audioHash
      coverHash
      duration
      price
      createdAt
      artist {
        id
        username
        displayName
        avatarHash
        isVerified
      }
    }
  }
`;

const GET_MARKETPLACE_LISTINGS = gql`
  query GetMarketplaceListings($first: Int!, $skip: Int!) {
    songListings(
      where: { isActive: true }
      first: $first
      skip: $skip
      orderBy: listedAt
      orderDirection: desc
    ) {
      id
      price
      listedAt
      expiresAt
      seller {
        id
        username
        displayName
      }
      song {
        id
        tokenId
        title
        genre
        audioHash
        coverHash
        duration
        artist {
          id
          username
          displayName
          avatarHash
        }
      }
    }
  }
`;

const GET_RECENT_SALES = gql`
  query GetRecentSales($first: Int!) {
    songSales(
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      price
      royaltyPaid
      timestamp
      seller {
        id
        username
      }
      buyer {
        id
        username
      }
      song {
        id
        tokenId
        title
        coverHash
        artist {
          username
          displayName
        }
      }
    }
  }
`;

// ============================================================
// PROFILE QUERIES
// ============================================================

const GET_PROFILE_BY_USERNAME = gql`
  query GetProfileByUsername($username: String!) {
    userProfiles(
      where: { username: $username }
      first: 1
    ) {
      id
      beatsId
      username
      displayName
      bio
      avatarHash
      bannerHash
      location
      website
      instagramHandle
      twitterHandle
      youtubeHandle
      spotifyHandle
      isVerified
      isArtist
      verificationExpiryTime
      reputationScore
      createdAt
      updatedAt
    }
  }
`;

const GET_PROFILE_BY_ADDRESS = gql`
  query GetProfileByAddress($address: ID!) {
    userProfile(id: $address) {
      id
      beatsId
      username
      displayName
      bio
      avatarHash
      bannerHash
      location
      website
      instagramHandle
      twitterHandle
      youtubeHandle
      spotifyHandle
      isVerified
      isArtist
      verificationExpiryTime
      reputationScore
      createdAt
      updatedAt
    }
  }
`;

const GET_ALL_PROFILES = gql`
  query GetAllProfiles($first: Int!, $skip: Int!) {
    userProfiles(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      beatsId
      username
      displayName
      bio
      avatarHash
      bannerHash
      isVerified
      isArtist
      reputationScore
      createdAt
    }
  }
`;

// ============================================================
// TYPES
// ============================================================

export interface SubgraphComment {
  id: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarHash: string;
  };
  content: string;
  timestamp: string;
  isDeleted: boolean;
}

export interface SubgraphPost {
  id: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarHash: string;
    isVerified: boolean;
    isArtist: boolean;
  };
  content: string;
  contentType: string;
  ipfsHash: string;
  timestamp: string;
  likes: string;
  comments: string;
  shares: string;
  isDeleted: boolean;
  isPinned: boolean;
  
  // NFT fields
  nftTokenId?: string;
  nftContractAddress?: string;
  nftPrice?: string;
  nftIsListed?: boolean;
  
  blockNumber: string;
  transactionHash: string;
  postComments?: SubgraphComment[];
  likedBy?: Array<{
    user: {
      id: string;
      username?: string;
    };
    timestamp?: string;
  }>;
  repostedBy?: Array<{
    user: {
      id: string;
      username?: string;
    };
    timestamp?: string;
  }>;
}

export interface SubgraphNFTCollection {
  id: string;
  name: string;
  symbol: string;
  contractAddress: string;
  description?: string;
  coverImageHash: string;
  bannerImageHash: string;
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarHash: string;
    isVerified?: boolean;
  };
  totalSupply: string;
  floorPrice: string;
  totalVolume: string;
  listedCount: string;
  ownerCount: string;
  isVerified: boolean;
  royaltyPercentage: string;
  createdAt: string;
  updatedAt: string;
  items?: SubgraphNFTItem[];
}

export interface SubgraphNFTAttribute {
  traitType: string;
  value: string;
  displayType?: string;
}

export interface SubgraphNFTItem {
  id: string;
  tokenId: string;
  name: string;
  description?: string;
  imageHash: string;
  animationHash?: string;
  metadataURI?: string;
  owner: {
    id: string;
    username: string;
    displayName: string;
    avatarHash?: string;
    isVerified?: boolean;
  };
  creator: {
    id: string;
    username: string;
    displayName: string;
    avatarHash?: string;
  };
  collection: {
    id: string;
    name: string;
    symbol?: string;
    contractAddress: string;
    royaltyPercentage?: string;
  };
  lastSalePrice?: string;
  currentPrice?: string;
  isListed: boolean;
  isFrozen: boolean;
  attributes?: SubgraphNFTAttribute[];
  listings?: SubgraphNFTListing[];
  offers?: SubgraphNFTOffer[];
  sales?: SubgraphNFTSale[];
  mintedAt: string;
  updatedAt: string;
  blockNumber?: string;
  transactionHash?: string;
}

export interface SubgraphNFTListing {
  id: string;
  item?: SubgraphNFTItem;
  seller: {
    id: string;
    username: string;
    displayName?: string;
    avatarHash?: string;
  };
  price: string;
  currency: string;
  startTime: string;
  endTime?: string;
  isActive: boolean;
  buyer?: {
    id: string;
    username: string;
  };
  soldAt?: string;
  soldPrice?: string;
  platformFee?: string;
  royaltyFee?: string;
  listedAt: string;
  cancelledAt?: string;
  blockNumber?: string;
  transactionHash?: string;
}

export interface SubgraphNFTOffer {
  id: string;
  item: SubgraphNFTItem;
  offerer: {
    id: string;
    username: string;
  };
  price: string;
  currency: string;
  isActive: boolean;
  isAccepted: boolean;
  isCancelled: boolean;
  expiresAt?: string;
  createdAt: string;
  acceptedAt?: string;
  cancelledAt?: string;
}

export interface SubgraphNFTSale {
  id: string;
  item?: SubgraphNFTItem;
  seller: {
    id: string;
    username: string;
  };
  buyer: {
    id: string;
    username: string;
  };
  price: string;
  currency: string;
  platformFee: string;
  royaltyFee: string;
  sellerProceeds: string;
  saleType: string;
  listingId?: string;
  offerId?: string;
  timestamp: string;
  blockNumber?: string;
  transactionHash?: string;
}

export interface SubgraphNFTActivity {
  id: string;
  activityType: string;
  item: {
    id: string;
    tokenId: string;
    name: string;
    imageHash: string;
    collection: {
      name: string;
    };
  };
  from?: {
    id: string;
    username: string;
    displayName: string;
  };
  to: {
    id: string;
    username: string;
    displayName: string;
  };
  price?: string;
  currency?: string;
  timestamp: string;
  transactionHash: string;
}

export interface SubgraphUserNFTStats {
  id: string;
  user: {
    id: string;
    username: string;
    displayName: string;
  };
  itemsOwned: string;
  itemsCreated: string;
  collectionsOwned: string;
  itemsSold: string;
  itemsBought: string;
  totalSalesVolume: string;
  totalPurchaseVolume: string;
  activeListings: string;
  totalListings: string;
  activeOffers: string;
  totalOffers: string;
  offersReceived: string;
  lastUpdated: string;
}

export interface SubgraphCollectionDailyStats {
  id: string;
  date: string;
  volumeETH: string;
  volumeUSD?: string;
  salesCount: string;
  averagePrice: string;
  newListings: string;
  cancelledListings: string;
  uniqueBuyers: string;
  uniqueSellers: string;
  floorPrice: string;
}

export interface SubgraphGlobalMarketplaceStats {
  id: string;
  totalNFTs: string;
  totalCollections: string;
  totalOwners: string;
  totalVolume: string;
  totalSales: string;
  activeListings: string;
  activeOffers: string;
  totalPlatformFees: string;
  totalRoyaltiesPaid: string;
  lastUpdated: string;
}

export interface SubgraphProfile {
  id: string; // User address
  username: string;
  displayName: string;
  bio: string;
  avatarHash: string;
  isVerified: boolean;
  isArtist: boolean;
  followerCount: string;
  followingCount: string;
  postCount: string;
  createdAt: string;
  updatedAt?: string;
  songs?: SubgraphSong[];
}

export interface SubgraphSong {
  id: string;
  tokenId: string;
  title: string;
  description?: string;
  genre: string;
  audioHash: string;
  coverHash: string;
  duration: string;
  price: string;
  royaltyPercentage: string;
  playCount: string;
  likeCount: string;
  createdAt: string;
  isListed: boolean;
  artist: {
    id: string;
    username: string;
    displayName: string;
    avatarHash: string;
    isVerified: boolean;
    isArtist: boolean;
  };
  owner?: {
    id: string;
    username: string;
    displayName: string;
    avatarHash?: string;
  };
  albums?: Array<{
    album: {
      id: string;
      title: string;
      coverImageHash: string;
    };
  }>;
  playlists?: Array<{
    playlist: {
      id: string;
      name: string;
      coverHash: string;
    };
  }>;
  sales?: Array<{
    id: string;
    buyer: {
      id: string;
      username: string;
    };
    price: string;
    timestamp: string;
  }>;
  blockNumber?: string;
  transactionHash?: string;
}

export interface SubgraphPlaylistSong {
  id: string;
  position: string;
  addedAt: string;
  addedBy: {
    id: string;
    username: string;
  };
  song: SubgraphSong;
}

export interface SubgraphPlaylist {
  id: string;
  name: string;
  description?: string;
  coverHash: string;
  isPublic: boolean;
  songCount: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    displayName: string;
    avatarHash: string;
    isVerified?: boolean;
  };
  songs?: SubgraphPlaylistSong[];
  blockNumber?: string;
  transactionHash?: string;
}

export interface SubgraphAlbum {
  id: string;
  albumId: string;
  title: string;
  description?: string;
  coverImageHash: string;
  albumType: 'SINGLE' | 'EP' | 'ALBUM';
  songCount: string;
  createdAt: string;
  releaseDate?: string;
  isPublished: boolean;
  metadataURI?: string;
  artist: {
    id: string;
    username: string;
    displayName: string;
    avatarHash: string;
    isVerified: boolean;
    isArtist: boolean;
    followerCount?: string;
  };
  songs?: Array<{
    id: string;
    position: string;
    addedAt: string;
    song: SubgraphSong;
  }>;
  blockNumber?: string;
  transactionHash?: string;
}

export interface SubgraphSongListing {
  id: string;
  price: string;
  listedAt: string;
  expiresAt?: string;
  seller: {
    id: string;
    username: string;
    displayName: string;
  };
  song: SubgraphSong;
}

export interface SubgraphSongSale {
  id: string;
  price: string;
  royaltyPaid: string;
  timestamp: string;
  seller: {
    id: string;
    username: string;
  };
  buyer: {
    id: string;
    username: string;
  };
  song: SubgraphSong;
}

export interface SubgraphGlobalStats {
  id: string;
  totalUsers: string;
  totalPosts: string;
  totalLikes: string;
  totalComments: string;
  totalFollows: string;
  totalSongs: string;
  totalPlaylists: string;
  totalMessages: string;
  totalTips: string;
  totalSales: string;
  lastUpdated: string;
}

// ============================================================
// POST SERVICE
// ============================================================

const postService = {
  /**
   * Get posts with pagination
   */
  async getPosts(
    first: number = 20,
    skip: number = 0,
    orderBy: string = 'timestamp',
    orderDirection: string = 'desc'
  ): Promise<SubgraphPost[]> {
    try {
      console.log('[Subgraph] Fetching posts:', { first, skip, orderBy, orderDirection });

      const result = await apolloClient.query({
        query: GET_POSTS,
        variables: { first, skip, orderBy, orderDirection },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const posts = (result.data as any)?.posts || [];
      console.log(`[Subgraph] Fetched ${posts.length} posts`);

      return posts;
    } catch (error) {
      console.error('[Subgraph] Error fetching posts:', error);
      return [];
    }
  },

  /**
   * Get single post by ID
   */
  async getPostById(postId: string): Promise<SubgraphPost | null> {
    try {
      console.log('[Subgraph] Fetching post:', postId);

      const result = await apolloClient.query({
        query: GET_POST_BY_ID,
        variables: { id: postId },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return null;
      }

      const post = (result.data as any)?.post;
      
      if (!post) {
        console.log('[Subgraph] Post not found:', postId);
        return null;
      }

      console.log('[Subgraph] Found post:', {
        id: post.id,
        contentType: post.contentType,
        hasMedia: !!post.ipfsHash,
        comments: post.postComments?.length || 0,
      });

      return post;
    } catch (error) {
      console.error('[Subgraph] Error fetching post:', error);
      return null;
    }
  },

  /**
   * Get posts by user
   */
  async getUserPosts(userId: string, first: number = 20, skip: number = 0): Promise<SubgraphPost[]> {
    try {
      console.log('[Subgraph] Fetching posts for user:', userId);

      const result = await apolloClient.query({
        query: GET_USER_POSTS,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const posts = (result.data as any)?.posts || [];
      console.log(`[Subgraph] Fetched ${posts.length} posts for user`);

      return posts;
    } catch (error) {
      console.error('[Subgraph] Error fetching user posts:', error);
      return [];
    }
  },

  /**
   * Get comments for a post
   */
  async getPostComments(postId: string, first: number = 50, skip: number = 0): Promise<SubgraphComment[]> {
    try {
      console.log('[Subgraph] Fetching comments for post:', postId);

      const result = await apolloClient.query({
        query: GET_POST_COMMENTS,
        variables: { postId, first, skip },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const comments = (result.data as any)?.comments || [];
      console.log(`[Subgraph] Fetched ${comments.length} comments`);

      return comments;
    } catch (error) {
      console.error('[Subgraph] Error fetching comments:', error);
      return [];
    }
  },
};

// ============================================================
// SONG/BEATS SERVICE
// ============================================================

const songService = {
  /**
   * Get all songs with pagination
   */
  async getAllSongs(
    first: number = 20,
    skip: number = 0,
    orderBy: string = 'createdAt',
    orderDirection: string = 'desc'
  ): Promise<SubgraphSong[]> {
    try {
      console.log('[Subgraph] Fetching songs:', { first, skip, orderBy, orderDirection });

      const result = await apolloClient.query({
        query: GET_ALL_SONGS,
        variables: { first, skip, orderBy, orderDirection },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const songs = (result.data as any)?.songs || [];
      console.log(`[Subgraph] Fetched ${songs.length} songs`);

      return songs;
    } catch (error) {
      console.error('[Subgraph] Error fetching songs:', error);
      return [];
    }
  },

  /**
   * Get song by ID
   */
  async getSongById(songId: string): Promise<SubgraphSong | null> {
    try {
      console.log('[Subgraph] Fetching song:', songId);

      const result = await apolloClient.query({
        query: GET_SONG_BY_ID,
        variables: { id: songId },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return null;
      }

      const song = (result.data as any)?.song;
      
      if (!song) {
        console.log('[Subgraph] Song not found:', songId);
        return null;
      }

      return song;
    } catch (error) {
      console.error('[Subgraph] Error fetching song:', error);
      return null;
    }
  },

  /**
   * Get trending songs
   */
  async getTrendingSongs(first: number = 20): Promise<SubgraphSong[]> {
    try {
      const result = await apolloClient.query({
        query: GET_TRENDING_SONGS,
        variables: { first },
        fetchPolicy: 'network-only',
      });

      const songs = (result.data as any)?.songs || [];
      console.log(`[Subgraph] Fetched ${songs.length} trending songs`);

      return songs;
    } catch (error) {
      console.error('[Subgraph] Error fetching trending songs:', error);
      return [];
    }
  },

  /**
   * Get songs by genre
   */
  async getSongsByGenre(genre: string, first: number = 20, skip: number = 0): Promise<SubgraphSong[]> {
    try {
      const result = await apolloClient.query({
        query: GET_SONGS_BY_GENRE,
        variables: { genre, first, skip },
        fetchPolicy: 'network-only',
      });

      const songs = (result.data as any)?.songs || [];
      console.log(`[Subgraph] Fetched ${songs.length} songs for genre: ${genre}`);

      return songs;
    } catch (error) {
      console.error('[Subgraph] Error fetching songs by genre:', error);
      return [];
    }
  },

  /**
   * Get user's songs (created by artist)
   */
  async getUserSongs(artistId: string, first: number = 20, skip: number = 0): Promise<SubgraphSong[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_SONGS,
        variables: { artistId: artistId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const songs = (result.data as any)?.songs || [];
      console.log(`[Subgraph] Fetched ${songs.length} songs for artist`);

      return songs;
    } catch (error) {
      console.error('[Subgraph] Error fetching user songs:', error);
      return [];
    }
  },

  /**
   * Get user's owned songs (NFTs owned by user)
   */
  async getUserOwnedSongs(ownerId: string, first: number = 100, skip: number = 0): Promise<SubgraphSong[]> {
    try {
      console.log('[Subgraph] Fetching owned songs for:', ownerId);
      console.log('[Subgraph] Query variables:', { ownerId: ownerId.toLowerCase(), first, skip });
      console.log('[Subgraph] Apollo Client endpoint:', apolloClient.link);

      // 🔥 Force clear cache before query
      await apolloClient.clearStore();
      console.log('[Subgraph] Cache cleared');

      const result = await apolloClient.query({
        query: GET_USER_OWNED_SONGS,
        variables: { ownerId: ownerId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only', // Force fresh data from network
      });

      console.log('[Subgraph] Raw GraphQL result:', result);
      console.log('[Subgraph] Result data:', result.data);
      
      const songs = (result.data as any)?.songs || [];
      console.log(`[Subgraph] Fetched ${songs.length} owned songs`);
      
      if (songs.length > 0) {
        console.log('[Subgraph] Sample song:', songs[0]);
      } else {
        console.warn('[Subgraph] No songs found for owner:', ownerId);
        console.warn('[Subgraph] GraphQL errors:', result.errors);
        console.warn('[Subgraph] This might indicate:');
        console.warn('  1. User does not own any NFTs');
        console.warn('  2. Subgraph not synced yet');
        console.warn('  3. Wrong owner address');
        console.warn('  4. Apollo cache issue');
      }

      return songs;
    } catch (error) {
      console.error('[Subgraph] Error fetching user owned songs:', error);
      if (error instanceof Error) {
        console.error('[Subgraph] Error details:', error.message);
        console.error('[Subgraph] Error stack:', error.stack);
      }
      return [];
    }
  },

  /**
   * Search songs
   */
  async searchSongs(searchTerm: string, first: number = 20): Promise<SubgraphSong[]> {
    try {
      const result = await apolloClient.query({
        query: SEARCH_SONGS,
        variables: { searchTerm, first },
        fetchPolicy: 'network-only',
      });

      const songs = (result.data as any)?.songs || [];
      console.log(`[Subgraph] Search found ${songs.length} songs`);

      return songs;
    } catch (error) {
      console.error('[Subgraph] Error searching songs:', error);
      return [];
    }
  },

  /**
   * Get new releases
   */
  async getNewReleases(first: number = 20): Promise<SubgraphSong[]> {
    try {
      const result = await apolloClient.query({
        query: GET_NEW_RELEASES,
        variables: { first },
        fetchPolicy: 'network-only',
      });

      const songs = (result.data as any)?.songs || [];
      console.log(`[Subgraph] Fetched ${songs.length} new releases`);

      return songs;
    } catch (error) {
      console.error('[Subgraph] Error fetching new releases:', error);
      return [];
    }
  },
};

// ============================================================
// PLAYLIST SERVICE
// ============================================================

const playlistService = {
  /**
   * Get all public playlists
   */
  async getAllPlaylists(first: number = 20, skip: number = 0): Promise<SubgraphPlaylist[]> {
    try {
      console.log('[Subgraph] Fetching playlists:', { first, skip });

      const result = await apolloClient.query({
        query: GET_ALL_PLAYLISTS,
        variables: { first, skip },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const playlists = (result.data as any)?.playlists || [];
      console.log(`[Subgraph] Fetched ${playlists.length} playlists`);

      return playlists;
    } catch (error) {
      console.error('[Subgraph] Error fetching playlists:', error);
      return [];
    }
  },

  /**
   * Get playlist by ID
   */
  async getPlaylistById(playlistId: string): Promise<SubgraphPlaylist | null> {
    try {
      console.log('[Subgraph] Fetching playlist:', playlistId);

      const result = await apolloClient.query({
        query: GET_PLAYLIST_BY_ID,
        variables: { id: playlistId },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return null;
      }

      const playlist = (result.data as any)?.playlist;
      
      if (!playlist) {
        console.log('[Subgraph] Playlist not found:', playlistId);
        return null;
      }

      return playlist;
    } catch (error) {
      console.error('[Subgraph] Error fetching playlist:', error);
      return null;
    }
  },

  /**
   * Get user's playlists
   */
  async getUserPlaylists(userId: string, first: number = 20, skip: number = 0): Promise<SubgraphPlaylist[]> {
    try {
      console.log('[Subgraph] Fetching playlists for user:', userId);

      const result = await apolloClient.query({
        query: GET_USER_PLAYLISTS,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const playlists = (result.data as any)?.playlists || [];
      console.log(`[Subgraph] Fetched ${playlists.length} playlists for user`);

      return playlists;
    } catch (error) {
      console.error('[Subgraph] Error fetching user playlists:', error);
      return [];
    }
  },
};

// ============================================================
// ALBUM SERVICE
// ============================================================

const albumService = {
  /**
   * Get all published albums
   */
  async getAllAlbums(first: number = 20, skip: number = 0): Promise<SubgraphAlbum[]> {
    try {
      console.log('[Subgraph] Fetching albums:', { first, skip });

      const result = await apolloClient.query({
        query: GET_ALL_ALBUMS,
        variables: { first, skip },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const albums = (result.data as any)?.albums || [];
      console.log(`[Subgraph] Fetched ${albums.length} albums`);

      return albums;
    } catch (error) {
      console.error('[Subgraph] Error fetching albums:', error);
      return [];
    }
  },

  /**
   * Get album by ID
   */
  async getAlbumById(albumId: string): Promise<SubgraphAlbum | null> {
    try {
      console.log('[Subgraph] Fetching album:', albumId);

      const result = await apolloClient.query({
        query: GET_ALBUM_BY_ID,
        variables: { id: albumId },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return null;
      }

      const album = (result.data as any)?.album;
      
      if (!album) {
        console.log('[Subgraph] Album not found:', albumId);
        return null;
      }

      return album;
    } catch (error) {
      console.error('[Subgraph] Error fetching album:', error);
      return null;
    }
  },

  /**
   * Get user's albums
   */
  async getUserAlbums(artistId: string, first: number = 20, skip: number = 0): Promise<SubgraphAlbum[]> {
    try {
      const normalizedArtistId = artistId.toLowerCase();
      console.log('[Subgraph] Fetching albums for artist:', normalizedArtistId);
      console.log('[Subgraph] Query variables:', { artistId: normalizedArtistId, first, skip });

      const result = await apolloClient.query({
        query: GET_USER_ALBUMS,
        variables: { artistId: normalizedArtistId, first, skip },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const albums = (result.data as any)?.albums || [];
      console.log(`[Subgraph] Fetched ${albums.length} albums for artist:`, albums);

      return albums;
    } catch (error) {
      console.error('[Subgraph] Error fetching user albums:', error);
      if (error instanceof Error) {
        console.error('[Subgraph] Error message:', error.message);
        console.error('[Subgraph] Error stack:', error.stack);
      }
      return [];
    }
  },
};

// ============================================================
// EXPLORE/DISCOVERY SERVICE
// ============================================================

const exploreService = {
  /**
   * Get global statistics
   */
  async getGlobalStats(): Promise<SubgraphGlobalStats | null> {
    try {
      console.log('[Subgraph] Fetching global stats');

      const result = await apolloClient.query({
        query: GET_GLOBAL_STATS,
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return null;
      }

      const stats = (result.data as any)?.globalStats;
      
      if (!stats) {
        console.log('[Subgraph] Global stats not found');
        return null;
      }

      console.log('[Subgraph] Fetched global stats:', {
        totalUsers: stats.totalUsers,
        totalPosts: stats.totalPosts,
        totalSongs: stats.totalSongs,
      });

      return stats;
    } catch (error) {
      console.error('[Subgraph] Error fetching global stats:', error);
      return null;
    }
  },

  /**
   * Get trending artists
   */
  async getTrendingArtists(first: number = 20): Promise<SubgraphProfile[]> {
    try {
      const result = await apolloClient.query({
        query: GET_TRENDING_ARTISTS,
        variables: { first },
        fetchPolicy: 'network-only',
      });

      const artists = (result.data as any)?.userProfiles || [];
      console.log(`[Subgraph] Fetched ${artists.length} trending artists`);

      return artists;
    } catch (error) {
      console.error('[Subgraph] Error fetching trending artists:', error);
      return [];
    }
  },

  /**
   * Get marketplace listings
   */
  async getMarketplaceListings(first: number = 20, skip: number = 0): Promise<SubgraphSongListing[]> {
    try {
      const result = await apolloClient.query({
        query: GET_MARKETPLACE_LISTINGS,
        variables: { first, skip },
        fetchPolicy: 'network-only',
      });

      const listings = (result.data as any)?.songListings || [];
      console.log(`[Subgraph] Fetched ${listings.length} marketplace listings`);

      return listings;
    } catch (error) {
      console.error('[Subgraph] Error fetching marketplace listings:', error);
      return [];
    }
  },

  /**
   * Get recent sales
   */
  async getRecentSales(first: number = 20): Promise<SubgraphSongSale[]> {
    try {
      const result = await apolloClient.query({
        query: GET_RECENT_SALES,
        variables: { first },
        fetchPolicy: 'network-only',
      });

      const sales = (result.data as any)?.songSales || [];
      console.log(`[Subgraph] Fetched ${sales.length} recent sales`);

      return sales;
    } catch (error) {
      console.error('[Subgraph] Error fetching recent sales:', error);
      return [];
    }
  },
};

// ============================================================
// NFT MARKETPLACE SERVICE
// ============================================================

export const nftMarketplaceService = {
  /**
   * Get all NFT collections
   */
  async getNFTCollections(
    first: number = 20, 
    skip: number = 0, 
    orderBy: string = 'totalVolume',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<SubgraphNFTCollection[]> {
    try {
      const result = await apolloClient.query({
        query: GET_NFT_COLLECTIONS,
        variables: { first, skip, orderBy, orderDirection },
        fetchPolicy: 'network-only',
      });

      const collections = (result.data as any)?.nftcollections || [];
      console.log(`[NFT Marketplace] Fetched ${collections.length} collections`);

      return collections;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching collections:', error);
      return [];
    }
  },

  /**
   * Get specific NFT collection
   */
  async getNFTCollection(id: string): Promise<SubgraphNFTCollection | null> {
    try {
      const result = await apolloClient.query({
        query: GET_NFT_COLLECTION,
        variables: { id },
        fetchPolicy: 'network-only',
      });

      const collection = (result.data as any)?.nftcollection;
      console.log('[NFT Marketplace] Fetched collection:', collection?.name);

      return collection || null;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching collection:', error);
      return null;
    }
  },

  /**
   * Get NFT items from a collection
   */
  async getNFTItems(
    collectionId?: string,
    first: number = 20,
    skip: number = 0,
    isListed?: boolean
  ): Promise<SubgraphNFTItem[]> {
    try {
      const result = await apolloClient.query({
        query: GET_NFT_ITEMS,
        variables: { collectionId, first, skip, isListed },
        fetchPolicy: 'network-only',
      });

      const items = (result.data as any)?.nftitems || [];
      console.log(`[NFT Marketplace] Fetched ${items.length} NFT items`);

      return items;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching NFT items:', error);
      return [];
    }
  },

  /**
   * Get specific NFT item
   */
  async getNFTItem(id: string): Promise<SubgraphNFTItem | null> {
    try {
      const result = await apolloClient.query({
        query: GET_NFT_ITEM,
        variables: { id },
        fetchPolicy: 'network-only',
      });

      const item = (result.data as any)?.nftitem;
      console.log('[NFT Marketplace] Fetched NFT item:', item?.name);

      return item || null;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching NFT item:', error);
      return null;
    }
  },

  /**
   * Get NFT listings
   */
  async getNFTListings(
    isActive?: boolean,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTListing[]> {
    try {
      const result = await apolloClient.query({
        query: GET_NFT_LISTINGS,
        variables: { isActive, first, skip },
        fetchPolicy: 'network-only',
      });

      const listings = (result.data as any)?.nftlistings || [];
      console.log(`[NFT Marketplace] Fetched ${listings.length} listings`);

      return listings;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching listings:', error);
      return [];
    }
  },

  /**
   * Get NFT activity feed
   */
  async getNFTActivity(
    itemId?: string,
    activityTypes?: string[],
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTActivity[]> {
    try {
      const result = await apolloClient.query({
        query: GET_NFT_ACTIVITY,
        variables: { itemId, activityTypes, first, skip },
        fetchPolicy: 'network-only',
      });

      const activities = (result.data as any)?.nftactivities || [];
      console.log(`[NFT Marketplace] Fetched ${activities.length} activities`);

      return activities;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching NFT activity:', error);
      return [];
    }
  },

  /**
   * Get user NFT stats
   */
  async getUserNFTStats(userId: string): Promise<SubgraphUserNFTStats | null> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_STATS,
        variables: { userId },
        fetchPolicy: 'network-only',
      });

      const stats = (result.data as any)?.usernftstat;
      console.log('[NFT Marketplace] Fetched user NFT stats');

      return stats || null;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching user NFT stats:', error);
      return null;
    }
  },

  /**
   * Get collection daily stats
   */
  async getCollectionDailyStats(
    collectionId: string,
    first: number = 30
  ): Promise<SubgraphCollectionDailyStats[]> {
    try {
      const result = await apolloClient.query({
        query: GET_COLLECTION_DAILY_STATS,
        variables: { collectionId, first },
        fetchPolicy: 'network-only',
      });

      const stats = (result.data as any)?.collectionDailyStats || [];
      console.log(`[NFT Marketplace] Fetched ${stats.length} daily stats`);

      return stats;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching collection daily stats:', error);
      return [];
    }
  },

  /**
   * Get global marketplace stats
   */
  async getGlobalMarketplaceStats(): Promise<SubgraphGlobalMarketplaceStats | null> {
    try {
      const result = await apolloClient.query({
        query: GET_GLOBAL_MARKETPLACE_STATS,
        variables: { id: '1' },
        fetchPolicy: 'network-only',
      });

      const stats = (result.data as any)?.globalMarketplaceStats;
      console.log('[NFT Marketplace] Fetched global marketplace stats');

      return stats || null;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching global marketplace stats:', error);
      return null;
    }
  },

  /**
   * Search NFT items
   */
  async searchNFTItems(
    searchTerm: string,
    first: number = 20
  ): Promise<SubgraphNFTItem[]> {
    try {
      const result = await apolloClient.query({
        query: SEARCH_NFT_ITEMS,
        variables: { searchTerm, first },
        fetchPolicy: 'network-only',
      });

      const items = (result.data as any)?.nftitems || [];
      console.log(`[NFT Marketplace] Found ${items.length} items for search: "${searchTerm}"`);

      return items;
    } catch (error) {
      console.error('[NFT Marketplace] Error searching NFT items:', error);
      return [];
    }
  },

  /**
   * Get trending NFT collections
   */
  async getTrendingNFTCollections(
    first: number = 10,
    days: number = 7
  ): Promise<SubgraphNFTCollection[]> {
    try {
      const result = await apolloClient.query({
        query: GET_TRENDING_NFT_COLLECTIONS,
        variables: { first, days },
        fetchPolicy: 'network-only',
      });

      const collections = (result.data as any)?.nftcollections || [];
      console.log(`[NFT Marketplace] Fetched ${collections.length} trending collections`);

      return collections;
    } catch (error) {
      console.error('[NFT Marketplace] Error fetching trending collections:', error);
      return [];
    }
  },
};

// ============================================================
// USER HISTORY SERVICE
// ============================================================

export const userHistoryService = {
  /**
   * Get user's owned NFTs
   */
  async getUserOwnedNFTs(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTItem[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_OWNED_NFTS,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const items = (result.data as any)?.nftitems || [];
      console.log(`[User History] Fetched ${items.length} owned NFTs for user ${userId}`);

      return items;
    } catch (error) {
      console.error('[User History] Error fetching owned NFTs:', error);
      return [];
    }
  },

  /**
   * Get user's created/minted NFTs
   */
  async getUserCreatedNFTs(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTItem[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_CREATED_NFTS,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const items = (result.data as any)?.nftitems || [];
      console.log(`[User History] Fetched ${items.length} created NFTs for user ${userId}`);

      return items;
    } catch (error) {
      console.error('[User History] Error fetching created NFTs:', error);
      return [];
    }
  },

  /**
   * Get user's NFT purchase history
   */
  async getUserNFTPurchases(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTSale[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_PURCHASES,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const sales = (result.data as any)?.nftsales || [];
      console.log(`[User History] Fetched ${sales.length} NFT purchases for user ${userId}`);

      return sales;
    } catch (error) {
      console.error('[User History] Error fetching NFT purchases:', error);
      return [];
    }
  },

  /**
   * Get user's NFT sales history
   */
  async getUserNFTSales(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTSale[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_SALES,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const sales = (result.data as any)?.nftsales || [];
      console.log(`[User History] Fetched ${sales.length} NFT sales for user ${userId}`);

      return sales;
    } catch (error) {
      console.error('[User History] Error fetching NFT sales:', error);
      return [];
    }
  },

  /**
   * Get user's NFT listings
   */
  async getUserNFTListings(
    userId: string,
    isActive?: boolean,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTListing[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_LISTINGS,
        variables: { userId: userId.toLowerCase(), isActive, first, skip },
        fetchPolicy: 'network-only',
      });

      const listings = (result.data as any)?.nftlistings || [];
      console.log(`[User History] Fetched ${listings.length} NFT listings for user ${userId}`);

      return listings;
    } catch (error) {
      console.error('[User History] Error fetching NFT listings:', error);
      return [];
    }
  },

  /**
   * Get user's NFT offers made
   */
  async getUserNFTOffersMade(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTOffer[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_OFFERS_MADE,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const offers = (result.data as any)?.nftoffers || [];
      console.log(`[User History] Fetched ${offers.length} NFT offers made by user ${userId}`);

      return offers;
    } catch (error) {
      console.error('[User History] Error fetching NFT offers made:', error);
      return [];
    }
  },

  /**
   * Get user's NFT offers received
   */
  async getUserNFTOffersReceived(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTOffer[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_OFFERS_RECEIVED,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const offers = (result.data as any)?.nftoffers || [];
      console.log(`[User History] Fetched ${offers.length} NFT offers received by user ${userId}`);

      return offers;
    } catch (error) {
      console.error('[User History] Error fetching NFT offers received:', error);
      return [];
    }
  },

  /**
   * Get user's NFT transfer history
   */
  async getUserNFTTransfers(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_TRANSFERS,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const transfers = (result.data as any)?.nfttransfers || [];
      console.log(`[User History] Fetched ${transfers.length} NFT transfers for user ${userId}`);

      return transfers;
    } catch (error) {
      console.error('[User History] Error fetching NFT transfers:', error);
      return [];
    }
  },

  /**
   * Get user's NFT activity feed
   */
  async getUserNFTActivity(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphNFTActivity[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_NFT_ACTIVITY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const activities = (result.data as any)?.nftactivities || [];
      console.log(`[User History] Fetched ${activities.length} NFT activities for user ${userId}`);

      return activities;
    } catch (error) {
      console.error('[User History] Error fetching NFT activity:', error);
      return [];
    }
  },

  /**
   * Get user's post history
   */
  async getUserPostHistory(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphPost[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_POST_HISTORY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const posts = (result.data as any)?.posts || [];
      console.log(`[User History] Fetched ${posts.length} posts for user ${userId}`);

      return posts;
    } catch (error) {
      console.error('[User History] Error fetching post history:', error);
      return [];
    }
  },

  /**
   * Get user's liked posts
   */
  async getUserLikedPosts(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_LIKED_POSTS,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const likes = (result.data as any)?.likes || [];
      console.log(`[User History] Fetched ${likes.length} liked posts for user ${userId}`);

      return likes;
    } catch (error) {
      console.error('[User History] Error fetching liked posts:', error);
      return [];
    }
  },

  /**
   * Get user's comment history
   */
  async getUserCommentHistory(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphComment[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_COMMENT_HISTORY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const comments = (result.data as any)?.comments || [];
      console.log(`[User History] Fetched ${comments.length} comments for user ${userId}`);

      return comments;
    } catch (error) {
      console.error('[User History] Error fetching comment history:', error);
      return [];
    }
  },

  /**
   * Get user's repost history
   */
  async getUserRepostHistory(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_REPOST_HISTORY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const reposts = (result.data as any)?.reposts || [];
      console.log(`[User History] Fetched ${reposts.length} reposts for user ${userId}`);

      return reposts;
    } catch (error) {
      console.error('[User History] Error fetching repost history:', error);
      return [];
    }
  },

  /**
   * Get user's following list
   */
  async getUserFollowing(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_FOLLOWING_HISTORY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const following = (result.data as any)?.follows || [];
      console.log(`[User History] Fetched ${following.length} following for user ${userId}`);

      return following;
    } catch (error) {
      console.error('[User History] Error fetching following:', error);
      return [];
    }
  },

  /**
   * Get user's followers list
   */
  async getUserFollowers(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_FOLLOWERS_HISTORY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const followers = (result.data as any)?.follows || [];
      console.log(`[User History] Fetched ${followers.length} followers for user ${userId}`);

      return followers;
    } catch (error) {
      console.error('[User History] Error fetching followers:', error);
      return [];
    }
  },

  /**
   * Get user's minted songs
   */
  async getUserMintedSongs(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphSong[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_MINTED_SONGS,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const songs = (result.data as any)?.songs || [];
      console.log(`[User History] Fetched ${songs.length} minted songs for user ${userId}`);

      return songs;
    } catch (error) {
      console.error('[User History] Error fetching minted songs:', error);
      return [];
    }
  },

  /**
   * Get user's song purchases
   */
  async getUserSongPurchases(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphSongSale[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_SONG_PURCHASES,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const sales = (result.data as any)?.songSales || [];
      console.log(`[User History] Fetched ${sales.length} song purchases for user ${userId}`);

      return sales;
    } catch (error) {
      console.error('[User History] Error fetching song purchases:', error);
      return [];
    }
  },

  /**
   * Get user's song sales
   */
  async getUserSongSales(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphSongSale[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_SONG_SALES,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const sales = (result.data as any)?.songSales || [];
      console.log(`[User History] Fetched ${sales.length} song sales for user ${userId}`);

      return sales;
    } catch (error) {
      console.error('[User History] Error fetching song sales:', error);
      return [];
    }
  },

  /**
   * Get user's playlists
   */
  async getUserPlaylists(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphPlaylist[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_PLAYLIST_HISTORY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const playlists = (result.data as any)?.playlists || [];
      console.log(`[User History] Fetched ${playlists.length} playlists for user ${userId}`);

      return playlists;
    } catch (error) {
      console.error('[User History] Error fetching playlists:', error);
      return [];
    }
  },

  /**
   * Get user's album listening history
   */
  async getUserAlbumHistory(
    userId: string,
    first: number = 20,
    skip: number = 0
  ): Promise<SubgraphAlbum[]> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_ALBUM_HISTORY,
        variables: { userId: userId.toLowerCase(), first, skip },
        fetchPolicy: 'network-only',
      });

      const albums = (result.data as any)?.albums || [];
      console.log(`[User History] Fetched ${albums.length} album history for user ${userId}`);

      return albums;
    } catch (error) {
      console.error('[User History] Error fetching album history:', error);
      return [];
    }
  },

  /**
   * Get user's all activity (comprehensive feed)
   */
  async getUserAllActivity(userId: string, first: number = 20): Promise<any> {
    try {
      const result = await apolloClient.query({
        query: GET_USER_ALL_ACTIVITY,
        variables: { userId: userId.toLowerCase(), first },
        fetchPolicy: 'network-only',
      });

      console.log(`[User History] Fetched comprehensive activity for user ${userId}`);

      return result.data;
    } catch (error) {
      console.error('[User History] Error fetching all activity:', error);
      return null;
    }
  },
};

// ============================================================
// MAIN EXPORT - Combined Service
// ============================================================

export const subgraphService = {
  // Post service methods
  ...postService,
  
  // Song/Beats service methods
  ...songService,
  
  // Playlist service methods
  ...playlistService,
  
  // Album service methods
  ...albumService,
  
  // Explore/Discovery service methods
  ...exploreService,

  /**
   * Get profile by username
   * @param username - The username to search for
   * @returns Profile data or null if not found
   */
  async getProfileByUsername(username: string): Promise<SubgraphProfile | null> {
    try {
      console.log('[Subgraph] Searching for username:', username);

      // Try exact match first
      const result = await apolloClient.query({
        query: GET_PROFILE_BY_USERNAME,
        variables: { username },
        fetchPolicy: 'network-only', // Always get fresh data
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
      }

      let profiles = (result.data as any)?.userProfiles || [];
      
      // If no exact match, try case-insensitive by fetching all and filtering
      if (profiles.length === 0) {
        console.log('[Subgraph] No exact match, trying case-insensitive search...');
        
        const allProfilesResult = await apolloClient.query({
          query: GET_ALL_PROFILES,
          variables: { first: 1000, skip: 0 },
          fetchPolicy: 'network-only',
        });

        const allProfiles = (allProfilesResult.data as any)?.userProfiles || [];
        const usernameLower = username.toLowerCase();
        
        profiles = allProfiles.filter((p: SubgraphProfile) => 
          p.username.toLowerCase() === usernameLower
        );
      }

      if (profiles.length === 0) {
        console.log('[Subgraph] No profile found for username:', username);
        return null;
      }

      const profile = profiles[0];
      console.log('[Subgraph] Found profile:', {
        address: profile.id,
        username: profile.username,
        displayName: profile.displayName,
      });

      return profile;
    } catch (error) {
      console.error('[Subgraph] Error fetching profile by username:', error);
      return null;
    }
  },

  /**
   * Get profile by address
   * @param address - The user address
   * @returns Profile data or null if not found
   */
  async getProfileByAddress(address: string): Promise<SubgraphProfile | null> {
    try {
      console.log('[Subgraph] Fetching profile for address:', address);

      const result = await apolloClient.query({
        query: GET_PROFILE_BY_ADDRESS,
        variables: { address: address.toLowerCase() },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return null;
      }

      const profile = (result.data as any)?.userProfile;
      
      if (!profile) {
        console.log('[Subgraph] No profile found for address:', address);
        return null;
      }

      console.log('[Subgraph] Found profile:', {
        address: profile.id,
        username: profile.username,
        displayName: profile.displayName,
      });

      return profile;
    } catch (error) {
      console.error('[Subgraph] Error fetching profile by address:', error);
      return null;
    }
  },

  /**
   * Get all profiles (paginated)
   * @param first - Number of profiles to fetch
   * @param skip - Number of profiles to skip
   * @returns Array of profiles
   */
  async getAllProfiles(first: number = 100, skip: number = 0): Promise<SubgraphProfile[]> {
    try {
      console.log('[Subgraph] Fetching all profiles:', { first, skip });

      const result = await apolloClient.query({
        query: GET_ALL_PROFILES,
        variables: { first, skip },
        fetchPolicy: 'network-only',
      });

      if (result.error) {
        console.error('[Subgraph] Query error:', result.error);
        return [];
      }

      const profiles = (result.data as any)?.userProfiles || [];
      console.log(`[Subgraph] Fetched ${profiles.length} profiles`);

      return profiles;
    } catch (error) {
      console.error('[Subgraph] Error fetching all profiles:', error);
      return [];
    }
  },

  /**
   * Search profiles by username (partial match)
   * @param searchTerm - The search term
   * @returns Array of matching profiles
   */
  async searchProfiles(searchTerm: string): Promise<SubgraphProfile[]> {
    try {
      // GraphQL doesn't support LIKE queries natively
      // So we fetch all profiles and filter client-side
      // For production, consider using a search service or full-text index
      
      const allProfiles = await this.getAllProfiles(1000, 0);
      
      const searchLower = searchTerm.toLowerCase();
      const matchingProfiles = allProfiles.filter(profile => 
        profile.username.toLowerCase().includes(searchLower) ||
        profile.displayName.toLowerCase().includes(searchLower)
      );

      console.log(`[Subgraph] Search "${searchTerm}" found ${matchingProfiles.length} profiles`);
      
      return matchingProfiles;
    } catch (error) {
      console.error('[Subgraph] Error searching profiles:', error);
      return [];
    }
  },

  /**
   * Search users by username
   * @param username - Username to search
   * @param limit - Maximum number of results
   * @returns Array of user profiles
   */
  async searchUsers(username: string, limit: number = 10): Promise<any[]> {
    try {
      const SEARCH_USERS = gql`
        query SearchUsers($username: String!, $first: Int!) {
          userProfiles(
            first: $first
            where: { username_contains_nocase: $username }
          ) {
            id
            username
            displayName
            avatarHash
            isVerified
            isArtist
          }
        }
      `;

      const result = await apolloClient.query({
        query: SEARCH_USERS,
        variables: { username, first: limit },
        fetchPolicy: 'network-only',
      });

      return (result.data as any)?.userProfiles || [];
    } catch (error) {
      console.error('[Subgraph] Error searching users:', error);
      return [];
    }
  },
  
  // NFT Marketplace methods
  ...nftMarketplaceService,
  
  // User History methods
  ...userHistoryService,
  
  /**
   * Get wallet activity for user
   * @param userAddress - User wallet address
   * @param first - Number of activities to fetch
   * @param skip - Number to skip for pagination
   * @returns Array of wallet activities
   */
  async getWalletActivity(
    userAddress: string,
    first: number = 20,
    skip: number = 0
  ): Promise<any[]> {
    try {
      const GET_WALLET_ACTIVITY = gql`
        query GetWalletActivity($userAddress: ID!, $first: Int!, $skip: Int!) {
          walletActivities(
            first: $first
            skip: $skip
            orderBy: timestamp
            orderDirection: desc
            where: { user: $userAddress }
          ) {
            id
            activityType
            from {
              id
              username
              displayName
            }
            to {
              id
              username
              displayName
            }
            amount
            token
            song {
              id
              title
              artist {
                username
                displayName
              }
            }
            status
            description
            timestamp
            transactionHash
          }
        }
      `;

      const result = await apolloClient.query({
        query: GET_WALLET_ACTIVITY,
        variables: { 
          userAddress: userAddress.toLowerCase(), 
          first, 
          skip 
        },
        fetchPolicy: 'network-only',
      });

      const activities = (result.data as any)?.walletActivities || [];
      console.log(`[Wallet] Fetched ${activities.length} activities for ${userAddress}`);

      return activities;
    } catch (error) {
      console.error('[Wallet] Error fetching wallet activity:', error);
      return [];
    }
  },
  
  /**
   * Get user's artist upgrade history
   */
  async getArtistUpgradeHistory(userAddress: string): Promise<any[]> {
    try {
      const GET_ARTIST_UPGRADES = gql`
        query GetArtistUpgrades($userAddress: ID!) {
          artistUpgradeEvents(
            where: { user: $userAddress }
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            feePaid
            timestamp
            transactionHash
          }
        }
      `;

      const result = await apolloClient.query({
        query: GET_ARTIST_UPGRADES,
        variables: { userAddress: userAddress.toLowerCase() },
        fetchPolicy: 'network-only',
      });

      return (result.data as any)?.artistUpgradeEvents || [];
    } catch (error) {
      console.error('[Profile] Error fetching artist upgrades:', error);
      return [];
    }
  },
  
  /**
   * Get user's verification history
   */
  async getVerificationHistory(userAddress: string): Promise<any[]> {
    try {
      const GET_VERIFICATION_HISTORY = gql`
        query GetVerificationHistory($userAddress: ID!) {
          verificationEvents(
            where: { user: $userAddress }
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            eventType
            expiryTime
            feePaid
            timestamp
            transactionHash
          }
        }
      `;

      const result = await apolloClient.query({
        query: GET_VERIFICATION_HISTORY,
        variables: { userAddress: userAddress.toLowerCase() },
        fetchPolicy: 'network-only',
      });

      return (result.data as any)?.verificationEvents || [];
    } catch (error) {
      console.error('[Profile] Error fetching verification history:', error);
      return [];
    }
  },
  
  /**
   * Get user's username change history
   */
  async getUsernameChangeHistory(userAddress: string): Promise<any[]> {
    try {
      const GET_USERNAME_CHANGES = gql`
        query GetUsernameChanges($userAddress: ID!) {
          usernameChangeEvents(
            where: { user: $userAddress }
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            oldUsername
            newUsername
            timestamp
            transactionHash
          }
        }
      `;

      const result = await apolloClient.query({
        query: GET_USERNAME_CHANGES,
        variables: { userAddress: userAddress.toLowerCase() },
        fetchPolicy: 'network-only',
      });

      return (result.data as any)?.usernameChangeEvents || [];
    } catch (error) {
      console.error('[Profile] Error fetching username changes:', error);
      return [];
    }
  },
  
  /**
   * Get profile by BeATS ID (BID)
   */
  async getProfileByBeatsId(beatsId: number): Promise<any | null> {
    try {
      const GET_PROFILE_BY_BID = gql`
        query GetProfileByBeatsId($beatsId: BigInt!) {
          userProfiles(
            where: { beatsId: $beatsId }
            first: 1
          ) {
            id
            beatsId
            username
            displayName
            bio
            avatarHash
            bannerHash
            location
            website
            instagramHandle
            twitterHandle
            youtubeHandle
            spotifyHandle
            isVerified
            isArtist
            verificationExpiryTime
            reputationScore
            createdAt
            updatedAt
          }
        }
      `;

      const result = await apolloClient.query({
        query: GET_PROFILE_BY_BID,
        variables: { beatsId: beatsId.toString() },
        fetchPolicy: 'network-only',
      });

      const profiles = (result.data as any)?.userProfiles || [];
      return profiles.length > 0 ? profiles[0] : null;
    } catch (error) {
      console.error('[Profile] Error fetching profile by BeATS ID:', error);
      return null;
    }
  },
};

export default subgraphService;
