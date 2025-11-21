// src/hooks/useGeneratedMusic.ts
import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { toast } from 'sonner';
import { sunoService } from '../services/sunoService';
import { ipfsService } from '../services/ipfsService';
import { somniaDatastreamServiceV3 } from '../services/somniaDatastreamService.v3';
import { createDefaultGeneratedMusicData, GeneratedMusicStatus } from '../config/somniaDataStreams.v3';
import { useNFTOperations } from './useNFTOperations';
import { useCurrentUserProfile } from './useRealTimeProfile';
import {
  GeneratedMusic,
  SunoGenerateRequest,
  MusicGenerationProgress,
  IPFSMetadata
} from '../types/music';

export const useGeneratedMusic = () => {
  const { address } = useAccount();
  const { profileData } = useCurrentUserProfile();
  const { mintSongNFT } = useNFTOperations();
  const [generatedMusic, setGeneratedMusic] = useState<GeneratedMusic[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [pendingTasks, setPendingTasks] = useState<Set<string>>(new Set());
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [progress, setProgress] = useState<MusicGenerationProgress>({
    stage: '',
    percent: 0
  });
  
  // 🔥 NEW: Track minting attempts to prevent double mint
  const [mintingTracks, setMintingTracks] = useState<Set<string>>(new Set()); // Currently minting
  const [mintedTracks, setMintedTracks] = useState<Set<string>>(new Set()); // Successfully minted

  // Load saved music from datastream on mount
  useEffect(() => {
    const loadFromDatastream = async () => {
      if (!address) return;
      
      try {
        await somniaDatastreamServiceV3.connect();
        const music = await somniaDatastreamServiceV3.getAllGeneratedMusic();
        
        // Convert to GeneratedMusic format
        const converted = music.map(m => ({
          id: m.taskId,
          title: m.title,
          artist: `${address.slice(0, 6)}...${address.slice(-4)}`,
          duration: 0,
          audioUrl: m.audioUrl,
          imageUrl: m.imageUrl,
          genre: m.style.split(',').map(s => s.trim()),
          taskId: m.taskId,
          createdAt: new Date(m.timestamp).toISOString(),
          isMinted: m.status === 2, // MINTED status
        }));
        
        setGeneratedMusic(converted);
        console.log(`📦 Loaded ${converted.length} songs from blockchain`);
      } catch (error) {
        console.error('Failed to load from datastream:', error);
      }
    };
    
    loadFromDatastream();
  }, [address]);

  const generateMusic = useCallback(async (params: SunoGenerateRequest) => {
    if (!address) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsGenerating(true);
    setLastPrompt(params.prompt);
    setProgress({ stage: 'Initializing music generation...', percent: 5 });

    try {
      // 1. Generate with Suno API
      setProgress({ stage: 'Generating music with AI...', percent: 15 });

      const generateResponse = await sunoService.generateMusic({
        ...params,
        callBackUrl: `${window.location.origin}/api/suno-callback`
      });

      if (generateResponse.code !== 200) {
        throw new Error(generateResponse.msg);
      }

      const taskId = generateResponse.data.taskId;
      setCurrentTaskId(taskId);

      // 2. Add to pending tasks for monitoring
      setPendingTasks(prev => new Set([...prev, taskId]));

      // 3. Setup polling for completion with better error handling
      setTimeout(async () => {
        try {
          setProgress({ stage: 'AI is composing your music...', percent: 30 });

          // Poll with more attempts (40 instead of 20)
          const taskResponse = await sunoService.pollTaskCompletion(taskId, 40);

          if (taskResponse.data.status === "SUCCESS") {
            // Process the generated tracks
            await handleSunoCallback({
              data: {
                data: taskResponse.data.response.sunoData,
                task_id: taskId
              }
            }, params, ''); // Transaction hash will be added later
          } else if (taskResponse.data.status === "PENDING" || taskResponse.data.status === "PROCESSING") {
            // Still processing - show message but don't fail
            toast.info('Generation is taking longer than expected. Please check back in a moment.');
            setIsGenerating(false);
          } else {
            throw new Error(taskResponse.data.errorMessage || 'Generation failed');
          }
        } catch (error) {
          console.error('Polling failed:', error);
          
          // Check if it's a timeout error
          if (error.message.includes('did not complete')) {
            toast.warning('Generation is taking longer than expected. Your music will appear when ready.', {
              duration: 5000
            });
          } else {
            toast.error(`Generation failed: ${error.message}`);
          }
          
          setIsGenerating(false);
        } finally {
          setPendingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          setCurrentTaskId(null);
        }
      }, 15000);

      return [];

    } catch (error) {
      console.error('Music generation failed:', error);
      toast.error(`Failed to generate music: ${error.message}`);
      setIsGenerating(false);
      setCurrentTaskId(null);
      throw error;
    }
  }, [address]);

  const handleSunoCallback = useCallback(async (
    callbackData: any,
    generationParams: SunoGenerateRequest,
    transactionHash: string
  ) => {
    try {
      setProgress({ stage: 'Processing generated tracks...', percent: 50 });

      const newMusic: Array<GeneratedMusic & { ipfsAudioHash?: string; ipfsImageHash?: string }> = [];

      for (const trackData of callbackData.data.data) {
        // 1. Create NFT metadata
        const nftMetadata: IPFSMetadata = {
          name: trackData.title,
          description: `AI-generated music by HiBeats. Prompt: "${trackData.prompt || generationParams.prompt}"`,
          image: trackData.imageUrl, // Will be replaced with IPFS URL
          audio_url: trackData.audioUrl, // Will be replaced with IPFS URL
          duration: trackData.duration,
          genre: trackData.tags.split(", "),
          created_by: address || '',
          model_used: trackData.modelName,
          generation_date: trackData.createTime,
          prompt: trackData.prompt || generationParams.prompt,
          task_id: callbackData.data.task_id,
          attributes: [
            { trait_type: "Song ID", value: trackData.id },
            { trait_type: "Task ID", value: callbackData.data.task_id },
            { trait_type: "Transaction Hash", value: transactionHash || "" },
            { trait_type: "Creator Address", value: address || "" },
            { trait_type: "Genre", value: trackData.tags },
            { trait_type: "Duration", value: Math.round(trackData.duration) },
            { trait_type: "Model", value: trackData.modelName },
            { trait_type: "Generation Date", value: trackData.createTime }
          ]
        };

        // 2. Upload to IPFS (if transaction hash is available)
        let ipfsResult;
        if (transactionHash) {
          setProgress({ stage: `Uploading "${trackData.title}" to IPFS...`, percent: 60 });

          try {
            ipfsResult = await ipfsService.uploadIndividualSongWithCompleteMetadata(
              trackData,
              generationParams,
              transactionHash,
              callbackData.data.task_id,
              address || ''
            );
          } catch (ipfsError) {
            console.error('IPFS upload failed:', ipfsError);
            toast.warning(`Failed to upload "${trackData.title}" to IPFS, using original URLs`);
          }
        }

        // 3. Create music item with IPFS hashes
        const musicItem = {
          id: trackData.id,
          title: trackData.title,
          artist: `${address?.slice(0, 6)}...${address?.slice(-4)}` || 'HiBeats AI',
          duration: Math.round(trackData.duration),
          audioUrl: ipfsResult ? ipfsService.getGatewayUrl(ipfsResult.audioHash) : trackData.audioUrl,
          imageUrl: ipfsResult ? ipfsService.getGatewayUrl(ipfsResult.imageHash) : trackData.imageUrl,
          originalAudioUrl: trackData.audioUrl,
          originalImageUrl: trackData.imageUrl,
          genre: trackData.tags.split(", "),
          ipfsHash: ipfsResult?.metadataHash,
          ipfsAudioHash: ipfsResult?.audioHash,
          ipfsImageHash: ipfsResult?.imageHash,
          metadata: nftMetadata,
          taskId: callbackData.data.task_id,
          createdAt: trackData.createTime
        };

        newMusic.push(musicItem);

        // 🔥 NEW: Auto-save to Somnia Datastream as backup
        try {
          setProgress({ stage: `Backing up "${trackData.title}" to blockchain...`, percent: 75 });
          
          const datastreamData = createDefaultGeneratedMusicData(
            address || '',
            callbackData.data.task_id,
            trackData.title,
            ipfsResult ? ipfsService.getGatewayUrl(ipfsResult.audioHash) : trackData.audioUrl,
            ipfsResult ? ipfsService.getGatewayUrl(ipfsResult.imageHash) : trackData.imageUrl,
            trackData.prompt || generationParams.prompt || '',
            trackData.tags || generationParams.style || '',
            generationParams.lyrics || ''
          );

          // Save to datastream (immediate write)
          await somniaDatastreamServiceV3.saveGeneratedMusic(datastreamData, true);
          
          console.log('✅ Music backed up to datastream:', trackData.title);
        } catch (datastreamError) {
          console.error('Failed to backup to datastream:', datastreamError);
        }
      }

      // 4. Auto-mint NFTs for successfully uploaded tracks
      setProgress({ stage: 'Minting NFTs with FREE gas sponsorship...', percent: 80 });

      const mintedMusic: GeneratedMusic[] = [];
      
      for (let i = 0; i < newMusic.length; i++) {
        const track = newMusic[i];
        const mintProgress = 80 + ((i / newMusic.length) * 15);
        
        // 🔥 Use taskId as unique identifier for deduplication
        const trackIdentifier = track.taskId || track.id;

        try {
          // Only mint if IPFS upload was successful
          if (track.ipfsHash && track.ipfsAudioHash) {
            // 🔥 Check if already minted or currently minting
            if (mintedTracks.has(trackIdentifier)) {
              console.log(`⚠️ Track "${track.title}" already minted, skipping...`);
              mintedMusic.push({ ...track, isMinted: true });
              continue;
            }
            
            if (mintingTracks.has(trackIdentifier)) {
              console.log(`⚠️ Track "${track.title}" is currently minting, skipping...`);
              mintedMusic.push(track);
              continue;
            }
            
            // 🔥 Mark as minting
            setMintingTracks(prev => new Set([...prev, trackIdentifier]));
            
            setProgress({
              stage: `Minting NFT for "${track.title}" (gas-free)...`,
              percent: mintProgress
            });

            const metadataURI = `ipfs://${track.ipfsHash}`;
            const artistName = profileData?.displayName || profileData?.username || `${address?.slice(0, 6)}...${address?.slice(-4)}` || 'Unknown Artist';
            
            console.log(`🎵 Auto-minting NFT for "${track.title}" (ID: ${trackIdentifier})`);
            
            const mintResult = await mintSongNFT({
              to: address || '0x0000000000000000000000000000000000000000',
              title: track.title,
              artist: artistName,
              genre: track.genre.join(', '),
              duration: Math.round(track.duration),
              ipfsAudioHash: track.ipfsAudioHash,
              ipfsArtworkHash: track.ipfsImageHash || '',
              royaltyPercentage: 500, // 5% royalty
              isExplicit: false,
              metadataURI: metadataURI,
              sunoId: track.id,
              taskId: track.taskId,
              prompt: generationParams.prompt
            });

            // 🔥 Remove from minting set
            setMintingTracks(prev => {
              const newSet = new Set(prev);
              newSet.delete(trackIdentifier);
              return newSet;
            });

            if (mintResult.success) {
              // 🔥 Mark as successfully minted
              setMintedTracks(prev => new Set([...prev, trackIdentifier]));
              
              const mintedTrack: GeneratedMusic = {
                ...track,
                tokenId: mintResult.tokenId,
                isMinted: true,
                mintTransactionHash: mintResult.transactionHash
              };
              mintedMusic.push(mintedTrack);
              console.log(`✅ NFT minted for "${track.title}": Token ID ${mintResult.tokenId}`);
            } else {
              console.error(`❌ NFT minting failed for "${track.title}":`, mintResult.error);
              mintedMusic.push(track);
            }
          } else {
            // No IPFS hash, skip minting
            mintedMusic.push(track);
          }
        } catch (mintError) {
          console.error(`Failed to mint NFT for track ${track.title}:`, mintError);
          
          // 🔥 Remove from minting set on error
          setMintingTracks(prev => {
            const newSet = new Set(prev);
            newSet.delete(trackIdentifier);
            return newSet;
          });
          
          mintedMusic.push(track);
        }
        
        // 🔥 CRITICAL: Add delay between mints to prevent nonce collision
        if (i < uploadedMusic.length - 1) {
          console.log(`⏳ Waiting before next mint (${i + 2}/${uploadedMusic.length})...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }

      // 5. Update UI state with minted tracks
      setGeneratedMusic(prev => [...mintedMusic, ...prev]);
      setProgress({ stage: 'Generation completed!', percent: 100 });

      // Show success summary
      const mintedCount = mintedMusic.filter(t => t.isMinted).length;
      if (mintedCount > 0) {
        toast.success(`🎉 ${mintedCount} NFT${mintedCount > 1 ? 's' : ''} minted successfully!`);
      }

      // 6. Reset states
      setIsGenerating(false);
      setCurrentTaskId(null);

    } catch (error) {
      console.error('Failed to process callback:', error);
      toast.error(`Failed to process generated music: ${error.message}`);
      setIsGenerating(false);
      setCurrentTaskId(null);
      throw error;
    }
  }, [address]);

  const clearGeneratedMusic = useCallback(() => {
    setGeneratedMusic([]);
    // Note: Datastream data is permanent and cannot be deleted
    console.log('⚠️ Note: Songs on blockchain cannot be deleted, only hidden from UI');
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setGeneratedMusic(prev => prev.filter(track => track.id !== trackId));
  }, []);

  return {
    generatedMusic,
    isGenerating,
    currentTaskId,
    pendingTasks,
    progress,
    lastPrompt,
    generateMusic,
    handleSunoCallback,
    clearGeneratedMusic,
    removeTrack,
    // 🔥 NEW: Expose minting state for UI
    mintingTracks,
    mintedTracks
  };
};