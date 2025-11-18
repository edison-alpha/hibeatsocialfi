// src/services/ipfsService.ts
import { IPFSMetadata, IPFSUploadResult } from '../types/music';

const PINATA_API_URL = 'https://api.pinata.cloud';

interface UploadOptions {
  onProgress?: (stage: string, progress: number) => void;
  retryAttempts?: number;
  useFallback?: boolean;
}

interface UploadMetadata {
  transactionHash?: string;
  taskId?: string;
  userAddress?: string;
  songTitle?: string;
  prompt?: string;
  metadataType?: string;
  name?: string;
  description?: string;
}

class IPFSService {
  private apiKey: string;
  private apiSecret: string;
  private jwt: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_PINATA_API_KEY;
    this.apiSecret = import.meta.env.VITE_PINATA_API_SECRET;
    this.jwt = import.meta.env.VITE_PINATA_API_JWT;

    if (!this.apiKey || !this.apiSecret || !this.jwt) {
      throw new Error('Pinata credentials are not configured. Please check VITE_PINATA_API_KEY, VITE_PINATA_API_SECRET, and VITE_PINATA_API_JWT');
    }
  }

  /**
   * Test connection to Pinata
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${PINATA_API_URL}/data/testAuthentication`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('IPFS connection test failed:', error);
      return false;
    }
  }

  /**
   * Upload file from URL to IPFS
   */
  async uploadFromUrl(
    url: string,
    filename: string,
    fileType: 'audio' | 'image',
    metadata?: UploadMetadata,
    options?: UploadOptions
  ): Promise<any> {
    try {
      options?.onProgress?.('Downloading file...', 10);

      // Download file from URL
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      const blob = await response.blob();
      options?.onProgress?.('Converting to buffer...', 30);

      // Convert blob to array buffer
      const arrayBuffer = await blob.arrayBuffer();
      const file = new File([arrayBuffer], filename, { type: blob.type });

      options?.onProgress?.('Uploading to IPFS...', 50);

      // Upload to Pinata
      const uploadResponse = await this.uploadFile(file, metadata, options);

      options?.onProgress?.('Upload completed!', 100);

      return uploadResponse;

    } catch (error) {
      console.error(`Failed to upload ${fileType} from URL:`, error);
      throw error;
    }
  }

  /**
   * Upload file to IPFS via Pinata
   */
  async uploadFile(
    file: File,
    metadata?: UploadMetadata,
    options?: UploadOptions
  ): Promise<any> {
    const maxRetries = options?.retryAttempts || 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        // Add metadata
        if (metadata) {
          const pinataMetadata = {
            name: file.name,
            keyvalues: {
              ...metadata,
              uploadDate: new Date().toISOString(),
              fileType: file.type,
              fileSize: file.size.toString()
            }
          };
          formData.append('pinataMetadata', JSON.stringify(pinataMetadata));
        }

        // Add options for pinning
        const pinataOptions = {
          cidVersion: 1,
          wrapWithDirectory: false
        };
        formData.append('pinataOptions', JSON.stringify(pinataOptions));

        const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.jwt}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

          if (response.status === 401) {
            throw new Error('Invalid Pinata credentials');
          } else if (response.status === 413) {
            throw new Error('File too large for Pinata upload');
          } else if (response.status === 429) {
            throw new Error('Upload rate limit exceeded');
          } else {
            throw new Error(errorData.error?.details || `Upload failed: ${response.status}`);
          }
        }

        const result = await response.json();
        return result;

      } catch (error) {
        lastError = error as Error;
        console.error(`Upload attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Upload failed after all retries');
  }

  /**
   * Upload NFT metadata to IPFS
   */
  async uploadNFTMetadata(
    metadata: IPFSMetadata,
    options?: UploadOptions
  ): Promise<any> {
    try {
      options?.onProgress?.('Preparing metadata...', 10);

      const metadataBlob = new Blob([JSON.stringify(metadata)], {
        type: 'application/json'
      });

      const metadataFile = new File([metadataBlob], 'metadata.json', {
        type: 'application/json'
      });

      options?.onProgress?.('Uploading metadata...', 50);

      const result = await this.uploadFile(metadataFile, {
        metadataType: 'nft',
        name: metadata.name,
        description: metadata.description
      }, options);

      options?.onProgress?.('Metadata uploaded!', 100);

      return result;

    } catch (error) {
      console.error('Failed to upload NFT metadata:', error);
      throw error;
    }
  }

  /**
   * Upload individual song with complete metadata
   */
  async uploadIndividualSongWithCompleteMetadata(
    trackData: any,
    generationParams: any,
    transactionHash: string,
    taskId: string,
    userAddress: string,
    options?: UploadOptions
  ): Promise<IPFSUploadResult> {
    try {
      options?.onProgress?.('Starting IPFS upload process...', 5);

      // Upload audio file
      const audioResult = await this.uploadFromUrl(
        trackData.audioUrl,
        `${trackData.title}_${trackData.id}.mp3`,
        'audio',
        {
          transactionHash,
          taskId,
          userAddress,
          songTitle: trackData.title,
          prompt: trackData.prompt
        },
        {
          ...options,
          onProgress: (stage, progress) => {
            options?.onProgress?.(`Audio: ${stage}`, progress * 0.4 + 10);
          }
        }
      );

      // Upload cover image
      const imageResult = await this.uploadFromUrl(
        trackData.imageUrl,
        `${trackData.title}_${trackData.id}_cover.jpg`,
        'image',
        {
          transactionHash,
          taskId,
          userAddress,
          songTitle: trackData.title
        },
        {
          ...options,
          onProgress: (stage, progress) => {
            options?.onProgress?.(`Image: ${stage}`, progress * 0.3 + 50);
          }
        }
      );

      // Create comprehensive metadata following OpenSea standards
      const metadata: IPFSMetadata = {
        name: trackData.title,
        description: `AI-generated music by HiBeats.\n\nPrompt: "${trackData.prompt}"\nGenre: ${trackData.tags}\nDuration: ${Math.floor(trackData.duration / 60)}:${Math.floor(trackData.duration % 60).toString().padStart(2, '0')}\nModel: ${trackData.modelName}\n\nMinted on HiBeats - Web3 Music Platform\nPowered by Somnia Blockchain`,
        image: `ipfs://${this.getHash(imageResult)}`,
        animation_url: `ipfs://${this.getHash(audioResult)}`, // Audio as animation_url (standard for music NFTs)
        external_url: `https://hibeats.app/song/${trackData.id}`,
        
        // Music-specific metadata
        audio_url: `ipfs://${this.getHash(audioResult)}`,
        duration: trackData.duration,
        genre: trackData.tags.split(', '),
        artist: 'HiBeats AI',
        title: trackData.title,
        
        // AI generation info
        created_by: userAddress,
        model_used: trackData.modelName,
        generation_date: trackData.createTime,
        prompt: trackData.prompt,
        task_id: taskId,
        
        // Platform info
        platform: 'HiBeats',
        blockchain: 'Somnia',
        
        // OpenSea attributes
        attributes: [
          { trait_type: "Artist", value: "HiBeats AI" },
          { trait_type: "Song ID", value: trackData.id },
          { trait_type: "Task ID", value: taskId },
          { trait_type: "Transaction Hash", value: transactionHash || "pending" },
          { trait_type: "Creator Address", value: userAddress },
          { trait_type: "Genre", value: trackData.tags },
          { trait_type: "Duration (seconds)", value: Math.round(trackData.duration), display_type: "number" as const },
          { trait_type: "Duration", value: `${Math.floor(trackData.duration / 60)}:${Math.floor(trackData.duration % 60).toString().padStart(2, '0')}` },
          { trait_type: "AI Model", value: trackData.modelName },
          { trait_type: "Generation Date", value: trackData.createTime },
          { trait_type: "Platform", value: "HiBeats" },
          { trait_type: "Blockchain", value: "Somnia" },
          { trait_type: "Type", value: "AI-Generated Music" }
        ]
      };

      console.log('📦 Uploading NFT metadata to IPFS:', {
        name: metadata.name,
        audioHash: this.getHash(audioResult),
        imageHash: this.getHash(imageResult),
        attributesCount: metadata.attributes.length
      });

      // Upload metadata
      const metadataResult = await this.uploadNFTMetadata(metadata, {
        ...options,
        onProgress: (stage, progress) => {
          options?.onProgress?.(`Metadata: ${stage}`, progress * 0.2 + 80);
        }
      });

      const finalMetadataHash = this.getHash(metadataResult);

      options?.onProgress?.('All uploads completed!', 100);

      console.log('✅ IPFS upload completed successfully:', {
        audioHash: this.getHash(audioResult),
        imageHash: this.getHash(imageResult),
        metadataHash: finalMetadataHash,
        metadataURI: `ipfs://${finalMetadataHash}`,
        gatewayUrl: this.getGatewayUrl(finalMetadataHash)
      });

      return {
        audioHash: this.getHash(audioResult),
        imageHash: this.getHash(imageResult),
        metadataHash: finalMetadataHash
      };

    } catch (error) {
      console.error('Failed to upload song with metadata:', error);
      throw error;
    }
  }

  /**
   * Get IPFS gateway URL
   */
  getGatewayUrl(ipfsHash: string): string {
    // Remove ipfs:// prefix if present
    const hash = ipfsHash.replace('ipfs://', '');
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }

  /**
   * Extract hash from Pinata response
   */
  private getHash(response: any): string {
    return response.IpfsHash || response.ipfsHash || response.Hash || response.hash;
  }

  /**
   * Get file information from IPFS
   */
  async getFileInfo(ipfsHash: string): Promise<any> {
    try {
      const response = await fetch(`${PINATA_API_URL}/data/pinList?hashContains=${ipfsHash}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get file info: ${response.status}`);
      }

      const data = await response.json();
      return data.rows?.[0] || null;

    } catch (error) {
      console.error('Failed to get file info:', error);
      return null;
    }
  }

  /**
   * Unpin file from IPFS (removes from Pinata's pinning service)
   */
  async unpinFile(ipfsHash: string): Promise<boolean> {
    try {
      const response = await fetch(`${PINATA_API_URL}/pinning/unpin/${ipfsHash}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      return response.ok;

    } catch (error) {
      console.error('Failed to unpin file:', error);
      return false;
    }
  }

  /**
   * Get upload history/stats
   */
  async getUploadStats(): Promise<any> {
    try {
      const response = await fetch(`${PINATA_API_URL}/data/pinList?status=pinned&pageLimit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get stats: ${response.status}`);
      }

      const data = await response.json();
      return {
        totalFiles: data.count || 0,
        totalSize: data.rows?.reduce((sum: number, file: any) => sum + (file.size || 0), 0) || 0
      };

    } catch (error) {
      console.error('Failed to get upload stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
export default ipfsService;