// src/types/music.ts
// Music generation and NFT related types

export interface SunoGenerateRequest {
  prompt: string;
  style?: string;
  title?: string;
  lyrics?: string;
  customMode: boolean;
  instrumental: boolean;
  model: "V3_5" | "V4" | "V4_5";
  callBackUrl?: string;
  negativeTags?: string;
  vocalGender?: "m" | "f";
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  lyricsMode?: string;
}

export interface SunoTrackData {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl: string;
  duration: number;
  tags: string;
  modelName: string;
  createTime: string;
  prompt: string;
}

export interface SunoGenerateResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
  };
}

export interface SunoTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    parentMusicId: string;
    param: string;
    response: {
      taskId: string;
      sunoData: SunoTrackData[];
    };
    status: string;
    type: string;
    operationType: string;
    errorCode: number | null;
    errorMessage: string | null;
  };
}

export interface IPFSMetadata {
  name: string;
  description: string;
  image: string;
  animation_url?: string; // For audio/video NFTs
  external_url?: string;
  audio_url?: string;
  duration?: number;
  genre?: string[];
  artist?: string;
  title?: string;
  album?: string;
  release_date?: string;
  language?: string;
  lyrics?: string;
  copyright?: string;
  isrc?: string;
  is_explicit?: boolean;
  featuring?: string;
  producer?: string;
  bpm?: number | null;
  created_by?: string;
  model_used?: string;
  generation_date?: string;
  prompt?: string;
  task_id?: string;
  platform?: string;
  blockchain?: string;
  minted_by?: string;
  minted_at?: string;
  audio_ipfs?: string;
  cover_ipfs?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
    display_type?: string; // OpenSea attribute display type (e.g., "number", "date", "boost_number")
  }>;
  seller_fee_basis_points?: number; // Royalty in basis points (500 = 5%)
  fee_recipient?: string; // Royalty recipient address
}

export interface IPFSUploadResult {
  audioHash: string;
  imageHash: string;
  metadataHash: string;
}

export interface GeneratedMusic {
  id: string;
  title: string;
  artist: string;
  duration: number;
  audioUrl: string;
  imageUrl: string;
  originalAudioUrl?: string; // Fallback URL dari Suno
  originalImageUrl?: string; // Fallback URL dari Suno
  genre: string[];
  lyrics?: string;
  ipfsHash?: string; // Metadata hash di IPFS
  ipfsAudioHash?: string; // Audio file hash di IPFS
  ipfsImageHash?: string; // Image file hash di IPFS
  metadata?: IPFSMetadata; // NFT metadata (prepared tapi belum di-mint)
  taskId: string;
  version?: string; // v1, v2 untuk multiple tracks per task
  createdAt: string;
  // NFT related fields
  tokenId?: string; // NFT token ID setelah minting
  isMinted?: boolean; // Status minting
  mintTransactionHash?: string; // Hash transaksi minting
  isApprovedForMarketplace?: boolean; // Status approval untuk marketplace
}

export interface NFTMintParams {
  to: string;
  title: string;
  artist: string;
  genre: string;
  duration: number;
  ipfsAudioHash: string;
  ipfsArtworkHash?: string;
  royaltyPercentage: number;
  isExplicit?: boolean;
  metadataURI: string; // Required - full IPFS URI to metadata JSON (e.g., ipfs://QmXXX)
  sunoId?: string;
  taskId?: string;
  modelUsed?: string;
  isRemixable?: boolean;
  prompt?: string;
  tags?: string;
  sunoCreatedAt?: number;
}

export interface MusicGenerationProgress {
  stage: string;
  percent: number;
  currentTrack?: number;
  totalTracks?: number;
}

export interface CompleteFlowOptions {
  royaltyPercentage?: number;
  isRemixable?: boolean;
  autoMint?: boolean;
  batchSize?: number;
}

export interface CompleteFlowResult {
  success: boolean;
  generatedTracks: GeneratedMusic[];
  mintedNFTs?: any[];
  failedMints?: any[];
}