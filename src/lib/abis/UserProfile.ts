// Auto-generated ABI for UserProfile
// Generated: 2025-11-17T19:36:53.760Z

export const USER_PROFILE_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "oldFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newFee",
        "type": "uint256"
      }
    ],
    "name": "ArtistUpgradeFeeUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "feePaid",
        "type": "uint256"
      }
    ],
    "name": "ArtistUpgraded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "artist",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "expiryTime",
        "type": "uint256"
      }
    ],
    "name": "ArtistVerified",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "beatsId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "ProfileCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "ProfileUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldTreasury",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newTreasury",
        "type": "address"
      }
    ],
    "name": "TreasuryUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "oldUsername",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "newUsername",
        "type": "string"
      }
    ],
    "name": "UsernameChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "VerificationExpired",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newExpiryTime",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "feePaid",
        "type": "uint256"
      }
    ],
    "name": "VerificationRenewed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "VERIFICATION_DURATION",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "addressToBid",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "addressToUsername",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "artistData",
    "outputs": [
      {
        "internalType": "string",
        "name": "artistName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "genre",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "totalStreams",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalLikes",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "songCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "followerCount",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isIndependent",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "recordLabel",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "artistUpgradeFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "bidToAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "newUsername",
        "type": "string"
      }
    ],
    "name": "changeUsername",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "checkAndUpdateVerification",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "displayName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "bio",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "avatarHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "isArtist",
        "type": "bool"
      }
    ],
    "name": "createProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "beatsId",
        "type": "uint256"
      }
    ],
    "name": "getAddressByBeatsId",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      }
    ],
    "name": "getAddressByUsername",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "artist",
        "type": "address"
      }
    ],
    "name": "getArtistData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "artistName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "genre",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "totalStreams",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalLikes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "songCount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "followerCount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isIndependent",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "recordLabel",
            "type": "string"
          }
        ],
        "internalType": "struct UserProfile.ArtistData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getArtistUpgradeFee",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getBeatsIdByAddress",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getDaysUntilExpiry",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getProfile",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "userAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "beatsId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "username",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "displayName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "bio",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "avatarHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "bannerHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "location",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "website",
            "type": "string"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "instagram",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "twitter",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "youtube",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "spotify",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "soundcloud",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "bandcamp",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "discord",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "telegram",
                "type": "string"
              }
            ],
            "internalType": "struct UserProfile.SocialLinks",
            "name": "socialLinks",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "isVerified",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isArtist",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "reputationScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "updatedAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct UserProfile.Profile",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "beatsId",
        "type": "uint256"
      }
    ],
    "name": "getProfileByBeatsId",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "userAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "beatsId",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "username",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "displayName",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "bio",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "avatarHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "bannerHash",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "location",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "website",
            "type": "string"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "instagram",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "twitter",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "youtube",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "spotify",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "soundcloud",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "bandcamp",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "discord",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "telegram",
                "type": "string"
              }
            ],
            "internalType": "struct UserProfile.SocialLinks",
            "name": "socialLinks",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "isVerified",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isArtist",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "reputationScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "updatedAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct UserProfile.Profile",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalProfiles",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUsernameByAddress",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVerificationDurationDays",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getVerificationExpiry",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getVerifiedArtists",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "artist",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "streams",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "likes",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "songs",
        "type": "uint256"
      }
    ],
    "name": "incrementArtistStats",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isUserVerified",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isVerificationActive",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nextBeatsId",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "profileExists",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "profiles",
    "outputs": [
      {
        "internalType": "address",
        "name": "userAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "beatsId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "displayName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "bio",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "avatarHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "bannerHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "website",
        "type": "string"
      },
      {
        "components": [
          {
            "internalType": "string",
            "name": "instagram",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "twitter",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "youtube",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "spotify",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "soundcloud",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "bandcamp",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "discord",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "telegram",
            "type": "string"
          }
        ],
        "internalType": "struct UserProfile.SocialLinks",
        "name": "socialLinks",
        "type": "tuple"
      },
      {
        "internalType": "bool",
        "name": "isVerified",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isArtist",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "reputationScore",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "updatedAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renewVerification",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newFee",
        "type": "uint256"
      }
    ],
    "name": "setArtistUpgradeFee",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newTreasury",
        "type": "address"
      }
    ],
    "name": "setTreasury",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "treasury",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "artistName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "genre",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "isIndependent",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "recordLabel",
        "type": "string"
      }
    ],
    "name": "updateArtistData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "displayName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "bio",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "avatarHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "bannerHash",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "location",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "website",
        "type": "string"
      }
    ],
    "name": "updateProfile",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "newScore",
        "type": "uint256"
      }
    ],
    "name": "updateReputation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "instagram",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "twitter",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "youtube",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "spotify",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "soundcloud",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "bandcamp",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "discord",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "telegram",
        "type": "string"
      }
    ],
    "name": "updateSocialLinks",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "artistName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "genre",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "isIndependent",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "recordLabel",
        "type": "string"
      }
    ],
    "name": "upgradeToArtist",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "name": "usernameToAddress",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "verificationExpiry",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "verifiedArtists",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "artistAddress",
        "type": "address"
      }
    ],
    "name": "verifyArtist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

export default USER_PROFILE_ABI;
