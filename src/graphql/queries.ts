import { gql } from '@apollo/client/core';

// Get posts with pagination
export const GET_POSTS = gql`
  query GetPosts(
    $first: Int!
    $skip: Int!
    $orderBy: String
    $orderDirection: String
    $where: Post_filter
  ) {
    posts(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
      where: $where
    ) {
      id
      content
      contentType
      ipfsHash
      timestamp
      likes
      comments
      shares
      isDeleted
      isPinned
      author {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
        followerCount
        followingCount
        postCount
      }
      blockNumber
      transactionHash
    }
  }
`;

// Get single post by ID
export const GET_POST = gql`
  query GetPost($id: ID!) {
    post(id: $id) {
      id
      content
      contentType
      ipfsHash
      timestamp
      likes
      comments
      shares
      isDeleted
      author {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      likedBy {
        id
        user {
          id
          username
        }
        timestamp
      }
      postComments {
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
        timestamp
      }
      blockNumber
      transactionHash
    }
  }
`;

// Get user profile
export const GET_USER_PROFILE = gql`
  query GetUserProfile($id: ID!) {
    userProfile(id: $id) {
      id
      username
      displayName
      bio
      avatarHash
      isVerified
      isArtist
      createdAt
      updatedAt
    }
  }
`;

// Get all users for mention suggestions
export const GET_ALL_USERS = gql`
  query GetAllUsers($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
    userProfiles(
      first: $first
      skip: $skip
      orderBy: $orderBy
      orderDirection: $orderDirection
    ) {
      id
      username
      displayName
      avatarHash
      isVerified
      isArtist
      createdAt
    }
  }
`;

// Search users by username or display name
export const SEARCH_USERS = gql`
  query SearchUsers($searchText: String!, $first: Int!) {
    userProfiles(
      where: {
        or: [
          { username_contains_nocase: $searchText }
          { displayName_contains_nocase: $searchText }
        ]
      }
      first: $first
      orderBy: createdAt
      orderDirection: desc
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

// Get global statistics
export const GET_GLOBAL_STATS = gql`
  query GetGlobalStats {
    globalStats(id: "global") {
      id
      totalUsers
      totalPosts
      totalLikes
      totalComments
      totalFollows
      lastUpdated
    }
  }
`;

// Get comments for a post
export const GET_COMMENTS = gql`
  query GetComments($postId: String!, $first: Int!, $skip: Int!) {
    comments(
      where: { post: $postId, isDeleted: false }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: asc
    ) {
      id
      content
      timestamp
      isDeleted
      author {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      blockNumber
      transactionHash
    }
  }
`;

// Search posts by content
export const SEARCH_POSTS = gql`
  query SearchPosts($searchText: String!, $first: Int!, $skip: Int!) {
    posts(
      where: { content_contains: $searchText, isDeleted: false }
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      content
      timestamp
      likes
      comments
      author {
        id
        username
        displayName
        avatarHash
      }
    }
  }
`;

// Get trending posts (most likes)
export const GET_TRENDING_POSTS = gql`
  query GetTrendingPosts($first: Int!) {
    posts(
      first: $first
      orderBy: likes
      orderDirection: desc
      where: { isDeleted: false }
    ) {
      id
      content
      contentType
      timestamp
      likes
      comments
      shares
      author {
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

// Get user's posts
export const GET_USER_POSTS = gql`
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
      timestamp
      likes
      comments
      shares
    }
  }
`;

// Get daily statistics
export const GET_DAILY_STATS = gql`
  query GetDailyStats($first: Int!) {
    dailyStats(
      first: $first
      orderBy: date
      orderDirection: desc
    ) {
      id
      date
      newUsers
      newPosts
      newLikes
      newComments
      newFollows
      activeUsers
    }
  }
`;

// Get post likes
export const GET_POST_LIKES = gql`
  query GetPostLikes($postId: ID!, $first: Int!) {
    likes(
      where: { post: $postId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      user {
        id
        username
        displayName
        avatarHash
      }
      timestamp
    }
  }
`;

// Get user's followers
export const GET_USER_FOLLOWERS = gql`
  query GetUserFollowers($userId: ID!, $first: Int!) {
    follows(
      where: { followed: $userId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      follower {
        id
        username
        displayName
        avatarHash
        followerCount
      }
      timestamp
    }
  }
`;

// Get user's following
export const GET_USER_FOLLOWING = gql`
  query GetUserFollowing($userId: ID!, $first: Int!) {
    follows(
      where: { follower: $userId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      followed {
        id
        username
        displayName
        avatarHash
        followerCount
      }
      timestamp
    }
  }
`;

// Check indexing status
export const GET_META = gql`
  query GetMeta {
    _meta {
      block {
        number
        hash
        timestamp
      }
      hasIndexingErrors
    }
  }
`;

// Get quote posts
export const GET_QUOTE_POSTS = gql`
  query GetQuotePosts($first: Int!, $skip: Int!) {
    quotePosts(
      first: $first
      skip: $skip
      orderBy: timestamp
      orderDirection: desc
      where: { isDeleted: false }
    ) {
      id
      content
      timestamp
      likes
      comments
      shares
      isDeleted
      author {
        id
        username
        displayName
        avatarHash
        isVerified
        isArtist
      }
      quotedPost {
        id
        content
        author {
          id
          username
          displayName
        }
        timestamp
      }
      blockNumber
      transactionHash
    }
  }
`;

// Get quotes for a specific post
export const GET_POST_QUOTES = gql`
  query GetPostQuotes($postId: ID!, $first: Int!) {
    quotePosts(
      where: { quotedPost: $postId, isDeleted: false }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      content
      timestamp
      likes
      author {
        id
        username
        displayName
        avatarHash
      }
    }
  }
`;

// Get user's reposts
export const GET_USER_REPOSTS = gql`
  query GetUserReposts($userId: ID!, $first: Int!) {
    reposts(
      where: { user: $userId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      post {
        id
        content
        author {
          id
          username
          displayName
        }
        timestamp
        likes
        comments
      }
      timestamp
    }
  }
`;

// Get user's bookmarks
export const GET_USER_BOOKMARKS = gql`
  query GetUserBookmarks($userId: ID!, $first: Int!) {
    bookmarks(
      where: { user: $userId }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      post {
        id
        content
        author {
          id
          username
          displayName
          avatarHash
        }
        timestamp
        likes
        comments
        shares
      }
      timestamp
    }
  }
`;

// Get comments for a post
export const GET_POST_COMMENTS = gql`
  query GetPostComments($postId: ID!, $first: Int!) {
    comments(
      where: { post: $postId, isDeleted: false }
      first: $first
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      content
      timestamp
      likes
      isDeleted
      author {
        id
        username
        displayName
        avatarHash
      }
    }
  }
`;
