import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Music,
  Wand2,
  Play,
  Pause,
  Volume2,
  RotateCcw,
  Download,
  Share2,
  Heart,
  MessageCircle,
  MoreHorizontal,
  X,
  Mic,
  Zap,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Upload,
  File,
  Image as ImageIcon
} from "lucide-react";
import { useAccount } from "wagmi";
import { sunoService } from "@/services/sunoService";
import { ipfsService } from "@/services/ipfsService";
import { SunoGenerateRequest, GeneratedMusic } from "@/types/music";
import { toast } from "sonner";
import { useNFTOperations } from "@/hooks/useNFTOperations";
import { useSequence } from "@/contexts/SequenceContext";
import { useCurrentUserProfile } from "@/hooks/useRealTimeProfile";
import ArtistUpgradeModal from "./ArtistUpgradeModal";
import { CONTRACT_ADDRESSES } from "@/lib/web3-config";
import { somniaDatastreamServiceV3 } from "@/services/somniaDatastreamService.v3";
import { createPostId, ContentType, type PostDataV3 } from "@/config/somniaDataStreams.v3";

interface CreateSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShareToFeed?: (post: any) => void;
}

const CreateSongModal = ({ isOpen, onClose, onShareToFeed }: CreateSongModalProps) => {
  const { address } = useAccount();
  const { isAccountReady, mintSongNFT: sequenceMintSong, smartAccountAddress } = useSequence();
  const { profileData } = useCurrentUserProfile(); // Get real-time profile
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [step, setStep] = useState<'prompt' | 'generating' | 'result'>('prompt');
  const [activeTab, setActiveTab] = useState<'ai' | 'upload'>('ai');
  const [prompt, setPrompt] = useState('');
  
  // Upload states
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [uploadedCoverFile, setUploadedCoverFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadArtist, setUploadArtist] = useState('');
  const [uploadGenre, setUploadGenre] = useState('');
  const [uploadDuration, setUploadDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Extended metadata like Spotify
  const [uploadAlbum, setUploadAlbum] = useState('');
  const [uploadReleaseDate, setUploadReleaseDate] = useState('');
  const [uploadLanguage, setUploadLanguage] = useState('');
  const [uploadLyrics, setUploadLyrics] = useState('');
  const [uploadCopyright, setUploadCopyright] = useState('');
  const [uploadISRC, setUploadISRC] = useState('');
  const [uploadIsExplicit, setUploadIsExplicit] = useState(false);
  const [uploadFeaturing, setUploadFeaturing] = useState('');
  const [uploadProducer, setUploadProducer] = useState('');
  const [uploadBPM, setUploadBPM] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  
  const [isInstrumental, setIsInstrumental] = useState(false);
  const [selectedSongForShare, setSelectedSongForShare] = useState<number>(0); // Index of selected song to share
  const [vocalType, setVocalType] = useState<'male' | 'female' | 'auto' | 'none'>('auto');
  const [model, setModel] = useState<'V3_5' | 'V4' | 'V4_5'>('V4');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [generatedSongs, setGeneratedSongs] = useState<GeneratedMusic[]>([]);
  const [generationProgress, setGenerationProgress] = useState({ stage: '', percent: 0 });
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const [serviceStatus, setServiceStatus] = useState<{
    sunoConfigured: boolean;
    ipfsConfigured: boolean;
    checked: boolean;
  }>({ sunoConfigured: false, ipfsConfigured: false, checked: false });
  const [isTestingApi, setIsTestingApi] = useState(false);

  // NFT Operations hook
  const { mintSongNFT, isMinting, mintingProgress } = useNFTOperations();

  // Test API connection
  const testApiConnection = async () => {
    setIsTestingApi(true);
    try {
      const validation = await sunoService.validateApiKey();
      if (validation.valid) {
        toast.success(`✅ ${validation.message}`);
      } else {
        toast.error(`❌ ${validation.message}`);
      }
    } catch (error) {
      toast.error(`❌ API test failed: ${error.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  // Check service configuration on mount
  useEffect(() => {
    const checkServices = async () => {
      try {
        const sunoKey = import.meta.env.VITE_SUNO_API_KEY;
        const pinataKey = import.meta.env.VITE_PINATA_API_KEY;
        const pinataSecret = import.meta.env.VITE_PINATA_API_SECRET;
        const pinataJwt = import.meta.env.VITE_PINATA_API_JWT;

        const sunoConfigured = !!sunoKey;
        const ipfsConfigured = !!(pinataKey && pinataSecret && pinataJwt);

        setServiceStatus({
          sunoConfigured,
          ipfsConfigured,
          checked: true
        });

        if (!sunoConfigured) {
          console.warn('VITE_SUNO_API_KEY is not configured');
        }
        if (!ipfsConfigured) {
          console.warn('Pinata IPFS credentials are not fully configured');
        }
      } catch (error) {
        console.error('Service check failed:', error);
      }
    };

    if (isOpen && !serviceStatus.checked) {
      checkServices();
    }
  }, [isOpen, serviceStatus.checked]);

  const genres = [
    'Electronic', 'Hip Hop', 'Jazz', 'Ambient', 'Rock', 'Pop',
    'R&B', 'Classical', 'Folk', 'Reggae', 'Blues', 'Country'
  ];

  const moods = [
    'Energetic', 'Chill', 'Melancholic', 'Happy', 'Dark', 'Uplifting',
    'Romantic', 'Aggressive', 'Peaceful', 'Epic', 'Dreamy', 'Intense'
  ];

  // Handle audio file upload
  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/flac'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|flac)$/i)) {
        toast.error('Please upload a valid audio file (MP3, WAV, OGG, FLAC)');
        return;
      }
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      
      setUploadedAudioFile(file);
      
      // Get audio duration
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      audio.onloadedmetadata = () => {
        setUploadDuration(Math.floor(audio.duration));
        URL.revokeObjectURL(audio.src);
      };
      
      toast.success(`Audio file selected: ${file.name}`);
    }
  };

  // Handle cover image upload
  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPG, PNG, WEBP)');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setUploadedCoverFile(file);
      toast.success(`Cover image selected: ${file.name}`);
    }
  };

  // Handle upload and mint NFT
  const handleUploadAndMint = async () => {
    // ✅ CHECK: Only artists can mint NFTs
    if (!profileData?.isArtist) {
      toast.error('Only artists can mint NFTs', {
        description: 'Upgrade to artist status to unlock NFT minting',
        action: {
          label: 'Become Artist',
          onClick: () => setShowUpgradeModal(true)
        }
      });
      return;
    }
    
    if (!uploadedAudioFile) {
      toast.error('Please select an audio file');
      return;
    }
    
    if (!uploadTitle.trim()) {
      toast.error('Please enter a song title');
      return;
    }
    
    if (!uploadArtist.trim()) {
      toast.error('Please enter artist name');
      return;
    }
    
    if (!uploadGenre) {
      toast.error('Please select a genre');
      return;
    }

    setIsUploading(true);

    try {
      toast.loading('Processing your music...', { id: 'upload' });
      
      // Upload audio file to IPFS
      console.log('📤 Processing audio file...');
      const audioResult = await ipfsService.uploadFile(uploadedAudioFile);
      const audioHash = audioResult.IpfsHash || audioResult.ipfsHash || audioResult.Hash || audioResult.hash;
      console.log('✅ Audio uploaded to IPFS:', audioHash);
      
      // Upload cover image to IPFS (or use default)
      let coverHash = 'QmDefault'; // Default cover hash
      if (uploadedCoverFile) {
        console.log('📤 Processing cover image...');
        const coverResult = await ipfsService.uploadFile(uploadedCoverFile);
        coverHash = coverResult.IpfsHash || coverResult.ipfsHash || coverResult.Hash || coverResult.hash;
        console.log('✅ Cover uploaded to IPFS:', coverHash);
      }
      
      toast.dismiss('upload');
      toast.loading('Creating NFT metadata...', { id: 'metadata' });
      
      // Create comprehensive NFT metadata following OpenSea and Spotify standards
      const currentDate = uploadReleaseDate || new Date().toISOString().split('T')[0];
      
      // Format IPFS URIs properly
      const formattedAudioHash = `ipfs://${audioHash}`;
      const formattedCoverHash = `ipfs://${coverHash}`;
      
      const metadata = {
        name: uploadTitle,
        description: uploadDescription || `${uploadTitle} by ${uploadArtist}${uploadFeaturing ? ` (feat. ${uploadFeaturing})` : ''}\n\n${uploadAlbum ? `Album: ${uploadAlbum}\n` : ''}Genre: ${uploadGenre}\nDuration: ${Math.floor(uploadDuration / 60)}:${(uploadDuration % 60).toString().padStart(2, '0')}${uploadProducer ? `\nProduced by: ${uploadProducer}` : ''}${uploadBPM ? `\nBPM: ${uploadBPM}` : ''}${uploadLanguage ? `\nLanguage: ${uploadLanguage}` : ''}\n\nMinted on HiBeats - Web3 Music Platform\nPowered by Somnia Blockchain`,
        image: formattedCoverHash,
        animation_url: formattedAudioHash, // Audio file as animation_url (standard for music NFTs)
        external_url: `https://hibeats.app/song/${audioHash}`,
        
        // Music-specific metadata (Spotify-like)
        artist: uploadArtist,
        title: uploadTitle,
        album: uploadAlbum || 'Single',
        genre: uploadGenre,
        duration: uploadDuration,
        duration_formatted: `${Math.floor(uploadDuration / 60)}:${(uploadDuration % 60).toString().padStart(2, '0')}`,
        release_date: currentDate,
        language: uploadLanguage || 'Unknown',
        lyrics: uploadLyrics || '',
        copyright: uploadCopyright || `© ${new Date().getFullYear()} ${uploadArtist}. All rights reserved.`,
        isrc: uploadISRC || '',
        is_explicit: uploadIsExplicit,
        featuring: uploadFeaturing || '',
        producer: uploadProducer || uploadArtist,
        bpm: uploadBPM ? parseInt(uploadBPM) : null,
        
        // IPFS hashes for reference
        audio_ipfs: formattedAudioHash,
        cover_ipfs: formattedCoverHash,
        
        // Platform info
        platform: 'HiBeats',
        blockchain: 'Somnia',
        minted_by: address,
        minted_at: new Date().toISOString(),
        
        // NFT attributes for marketplaces (comprehensive)
        attributes: [
          { 
            trait_type: 'Artist', 
            value: uploadArtist 
          },
          ...(uploadFeaturing ? [{
            trait_type: 'Featuring',
            value: uploadFeaturing
          }] : []),
          ...(uploadProducer ? [{
            trait_type: 'Producer',
            value: uploadProducer
          }] : []),
          {
            trait_type: 'Album',
            value: uploadAlbum || 'Single'
          },
          { 
            trait_type: 'Genre', 
            value: uploadGenre 
          },
          { 
            trait_type: 'Duration (seconds)', 
            value: uploadDuration,
            display_type: 'number'
          },
          { 
            trait_type: 'Duration', 
            value: `${Math.floor(uploadDuration / 60)}:${(uploadDuration % 60).toString().padStart(2, '0')}` 
          },
          {
            trait_type: 'Release Year',
            value: new Date(currentDate).getFullYear().toString()
          },
          {
            trait_type: 'Release Date',
            value: currentDate
          },
          {
            trait_type: 'Language',
            value: uploadLanguage || 'Unknown'
          },
          ...(uploadBPM ? [{
            trait_type: 'BPM',
            value: parseInt(uploadBPM),
            display_type: 'number'
          }] : []),
          {
            trait_type: 'Explicit Content',
            value: uploadIsExplicit ? 'Yes' : 'No'
          },
          {
            trait_type: 'Has Lyrics',
            value: uploadLyrics ? 'Yes' : 'No'
          },
          {
            trait_type: 'Platform',
            value: 'HiBeats'
          },
          {
            trait_type: 'Blockchain',
            value: 'Somnia'
          },
          {
            trait_type: 'Type',
            value: 'Music NFT'
          },
          ...(uploadISRC ? [{
            trait_type: 'ISRC',
            value: uploadISRC
          }] : [])
        ],
        
        // Royalty info
        seller_fee_basis_points: 500, // 5%
        fee_recipient: address,
        
        // Additional metadata for music platforms
        has_lyrics: !!uploadLyrics,
        has_cover_art: !!uploadedCoverFile,
        quality: 'High',
        file_type: uploadedAudioFile.type
      };
      
      console.log('📝 NFT Metadata created:', metadata);
      console.log('📋 Metadata fields check:', {
        hasName: !!metadata.name,
        hasDescription: !!metadata.description,
        hasImage: !!metadata.image,
        hasAnimationUrl: !!metadata.animation_url,
        hasAttributes: metadata.attributes.length,
        imageFormat: metadata.image,
        animationFormat: metadata.animation_url
      });
      
      // Upload metadata to IPFS
      const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
      const metadataResult = await ipfsService.uploadFile(metadataBlob as any);
      
      // Extract IPFS hash from Pinata response
      const metadataHash = metadataResult.IpfsHash || metadataResult.ipfsHash || metadataResult.Hash || metadataResult.hash;
      
      console.log('✅ Metadata uploaded to IPFS:', metadataHash);
      console.log('🔗 Metadata URI:', `ipfs://${metadataHash}`);
      console.log('🔗 Gateway URL:', `https://gateway.pinata.cloud/ipfs/${metadataHash}`);
      console.log('🔍 Verify metadata at:', `https://gateway.pinata.cloud/ipfs/${metadataHash}`);
      
      toast.dismiss('metadata');
      toast.loading('Minting NFT...', { id: 'mint' });
      
      // Mint NFT using SequenceContext dengan metadata URI yang benar
      console.log('🎯 Minting NFT with parameters:', {
        to: address,
        title: uploadTitle,
        artist: uploadArtist,
        genre: uploadGenre,
        duration: uploadDuration,
        audioHash: formattedAudioHash,
        coverHash: formattedCoverHash,
        royalty: 500,
        isExplicit: uploadIsExplicit,
        metadataURI: `ipfs://${metadataHash}`
      });
      
      await sequenceMintSong(
        address!,
        uploadTitle,
        uploadArtist,
        uploadGenre,
        uploadDuration,
        formattedAudioHash,
        formattedCoverHash,
        500, // 5% royalty
        uploadIsExplicit,
        `ipfs://${metadataHash}` // Metadata URI yang benar
      );
      
      toast.dismiss('mint');
      toast.success('🎉 Song minted as NFT successfully!');
      
      // Reset form - clear all fields
      setUploadedAudioFile(null);
      setUploadedCoverFile(null);
      setUploadTitle('');
      setUploadArtist('');
      setUploadGenre('');
      setUploadDuration(0);
      setUploadAlbum('');
      setUploadReleaseDate('');
      setUploadLanguage('');
      setUploadLyrics('');
      setUploadCopyright('');
      setUploadISRC('');
      setUploadIsExplicit(false);
      setUploadFeaturing('');
      setUploadProducer('');
      setUploadBPM('');
      setUploadDescription('');
      if (audioInputRef.current) audioInputRef.current.value = '';
      if (coverInputRef.current) coverInputRef.current.value = '';
      
      onClose();
      
    } catch (error) {
      console.error('❌ Upload and mint failed:', error);
      toast.dismiss('upload');
      toast.dismiss('metadata');
      toast.dismiss('mint');
      toast.error(`Failed to upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt for your song');
      return;
    }

    if (prompt.trim().length < 10) {
      toast.error('Please provide a more detailed prompt (at least 10 characters)');
      return;
    }

    try {
      setStep('generating');
      setGenerationProgress({ stage: 'Initializing...', percent: 5 });

      // Validate Suno API before generating
      setGenerationProgress({ stage: 'Validating API connection...', percent: 10 });
      
      try {
        const validation = await sunoService.validateApiKey();
        if (!validation.valid) {
          throw new Error(validation.message);
        }
        console.log('✅ Suno API validation successful:', validation.message);
      } catch (validationError) {
        console.error('❌ Suno API validation failed:', validationError);
        throw new Error(
          `API validation failed: ${validationError.message}\n\n` +
          '💡 Possible solutions:\n' +
          '1. Check your internet connection\n' +
          '2. Try using a VPN\n' +
          '3. Set up a proxy server (see suno-proxy.js)\n' +
          '4. Use VITE_SUNO_PROXY_URL in .env for CORS proxy'
        );
      }

      // Test IPFS connection (optional)
      if (serviceStatus.ipfsConfigured) {
        const ipfsConnected = await ipfsService.testConnection();
        if (!ipfsConnected) {
          console.warn('IPFS service connection test failed, will use fallback URLs');
        }
      }

      // Prepare generation parameters
      const generationParams: SunoGenerateRequest = {
        prompt: prompt.trim(),
        customMode: false, // Simple mode for now
        instrumental: isInstrumental,
        model: model,
        callBackUrl: `${window.location.origin}/api/suno-callback`
      };

      // Add vocal gender if not instrumental
      if (!isInstrumental && vocalType !== 'auto' && vocalType !== 'none') {
        generationParams.vocalGender = vocalType === 'male' ? 'm' : 'f';
      }

      setGenerationProgress({ stage: 'Starting AI music generation...', percent: 15 });

      // Generate music using Suno API
      const sunoResponse = await sunoService.generateMusic(generationParams);

      if (sunoResponse.code !== 200) {
        throw new Error(sunoResponse.msg || 'Failed to start generation');
      }

      const taskId = sunoResponse.data.taskId;
      setCurrentTaskId(taskId);

      setGenerationProgress({ stage: 'AI is composing your music...', percent: 30 });

      // Poll for completion with better error handling
      const maxAttempts = 40; // Allow more time for generation
      let attempts = 0;
      let completedTask = null;

      while (attempts < maxAttempts) {
        try {
          const statusResponse = await sunoService.getTaskStatus(taskId);

          if (statusResponse.data.status === 'SUCCESS') {
            completedTask = statusResponse;
            break;
          }

          if (statusResponse.data.status.includes('FAILED') ||
              statusResponse.data.status === 'SENSITIVE_WORD_ERROR') {
            throw new Error(statusResponse.data.errorMessage || 'Generation failed');
          }

          // Update progress based on attempts
          const progressPercent = 30 + (attempts / maxAttempts) * 30;
          setGenerationProgress({
            stage: `Generating music... (${attempts + 1}/${maxAttempts})`,
            percent: Math.min(progressPercent, 60)
          });

          // Wait before next check (exponential backoff)
          const delay = Math.min(2000 * Math.pow(1.1, attempts), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;

        } catch (pollError) {
          console.error(`Polling attempt ${attempts + 1} failed:`, pollError);
          attempts++;

          if (attempts >= maxAttempts) {
            throw new Error('Generation is taking too long. Please try again.');
          }

          // Continue polling on temporary errors
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      if (!completedTask) {
        throw new Error('Generation timeout. Please try again.');
      }

      const tracks = completedTask.data.response.sunoData;

      if (!tracks || tracks.length === 0) {
        throw new Error('No tracks were generated. Please try with a different prompt.');
      }

      setGenerationProgress({ stage: 'Processing and securing your music...', percent: 65 });

      // Upload each track to IPFS with better error handling
      const uploadedTracks: GeneratedMusic[] = [];
      const failedUploads: string[] = [];

      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const trackProgress = 65 + ((i / tracks.length) * 30);

        setGenerationProgress({
          stage: `Processing "${track.title}"...`,
          percent: trackProgress
        });

        try {
          // Upload to IPFS with complete metadata
          const ipfsResult = await ipfsService.uploadIndividualSongWithCompleteMetadata(
            track,
            generationParams,
            '', // Transaction hash will be added when minting NFT
            taskId,
            '0x0000000000000000000000000000000000000000', // Placeholder address
            {
              onProgress: (stage, progress) => {
                // Update sub-progress for this track - hide technical details
                const subProgress = trackProgress + (progress * 0.3);
                setGenerationProgress({
                  stage: `Processing "${track.title}"...`,
                  percent: Math.min(subProgress, 95)
                });
              },
              retryAttempts: 2
            }
          );

          const artistName = profileData?.displayName || profileData?.username || `${address?.slice(0, 6)}...${address?.slice(-4)}` || 'HiBeats AI';

          const generatedTrack: GeneratedMusic = {
            id: track.id,
            title: track.title,
            artist: artistName,
            duration: track.duration,
            audioUrl: ipfsService.getGatewayUrl(ipfsResult.audioHash),
            imageUrl: ipfsService.getGatewayUrl(ipfsResult.imageHash),
            originalAudioUrl: track.audioUrl,
            originalImageUrl: track.imageUrl,
            genre: track.tags.split(', '),
            ipfsHash: ipfsResult.metadataHash,
            ipfsAudioHash: ipfsResult.audioHash,
            ipfsImageHash: ipfsResult.imageHash,
            taskId: taskId,
            createdAt: track.createTime,
            metadata: {
              name: track.title,
              description: `AI-generated music by HiBeats. Prompt: "${track.prompt}"`,
              image: `ipfs://${ipfsResult.imageHash}`,
              audio_url: `ipfs://${ipfsResult.audioHash}`,
              duration: track.duration,
              genre: track.tags.split(', '),
              created_by: '0x0000000000000000000000000000000000000000',
              model_used: track.modelName,
              generation_date: track.createTime,
              prompt: track.prompt,
              task_id: taskId,
              attributes: [
                { trait_type: "Song ID", value: track.id },
                { trait_type: "Task ID", value: taskId },
                { trait_type: "Genre", value: track.tags },
                { trait_type: "Duration", value: Math.round(track.duration) },
                { trait_type: "Model", value: track.modelName },
                { trait_type: "Generation Date", value: track.createTime }
              ]
            }
          };

          uploadedTracks.push(generatedTrack);

        } catch (uploadError) {
          console.error(`Failed to upload track ${track.title}:`, uploadError);
          failedUploads.push(track.title);

          // Add track with original URLs as fallback
          const artistName = profileData?.displayName || profileData?.username || `${address?.slice(0, 6)}...${address?.slice(-4)}` || 'HiBeats AI';
          
          const fallbackTrack: GeneratedMusic = {
            id: track.id,
            title: track.title,
            artist: artistName,
            duration: track.duration,
            audioUrl: track.audioUrl,
            imageUrl: track.imageUrl,
            genre: track.tags.split(', '),
            taskId: taskId,
            createdAt: track.createTime
          };

          uploadedTracks.push(fallbackTrack);
        }
      }

      // Mint NFTs for successfully uploaded tracks
      setGenerationProgress({ stage: 'Minting NFTs with FREE gas sponsorship...', percent: 70 });

      const mintedTracks: GeneratedMusic[] = [];
      const failedMints: string[] = [];

      for (let i = 0; i < uploadedTracks.length; i++) {
        const track = uploadedTracks[i];
        const mintProgress = 70 + ((i / uploadedTracks.length) * 25);

        setGenerationProgress({
          stage: `Minting NFT for "${track.title}" (gas-free)...`,
          percent: mintProgress
        });

        try {
          // Only mint if IPFS upload was successful
          if (track.ipfsHash && track.ipfsAudioHash) {
            // Construct proper metadata URI
            const metadataURI = `ipfs://${track.ipfsHash}`;
            
            console.log(`🎵 Minting NFT for "${track.title}" with metadata URI:`, metadataURI);
            
            // Get artist name from profile or use address
            const artistName = profileData?.displayName || profileData?.username || `${address?.slice(0, 6)}...${address?.slice(-4)}` || 'Unknown Artist';
            
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
              metadataURI: metadataURI, // Full IPFS URI to metadata JSON
              sunoId: track.id,
              taskId: track.taskId,
              prompt: prompt
            });

            if (mintResult.success) {
              // Update track with NFT information
              const mintedTrack: GeneratedMusic = {
                ...track,
                tokenId: mintResult.tokenId,
                isMinted: true,
                mintTransactionHash: mintResult.transactionHash
              };
              mintedTracks.push(mintedTrack);

              console.log(`✅ NFT minted for "${track.title}": Token ID ${mintResult.tokenId}`);
            } else {
              console.error(`❌ NFT minting failed for "${track.title}":`, mintResult.error);
              failedMints.push(track.title);
              mintedTracks.push(track); // Add without NFT data
            }
          } else {
            // No IPFS hash, skip minting
            mintedTracks.push(track);
          }
        } catch (mintError) {
          console.error(`Failed to mint NFT for track ${track.title}:`, mintError);
          failedMints.push(track.title);
          mintedTracks.push(track); // Add without NFT data
        }
      }

      setGeneratedSongs(mintedTracks);
      
      // ⚡ Backup to Somnia Datastream (permanent, decentralized storage)
      setGenerationProgress({ stage: 'Backing up to blockchain...', percent: 95 });
      
      try {
        if (!smartAccountAddress) {
          console.warn('⚠️ [BACKUP] Smart account address not available, skipping backup');
        } else {
          console.log('💾 [BACKUP] Saving generated music to Somnia Datastream...');
          console.log('💾 [BACKUP] Smart Account Address:', smartAccountAddress);
          console.log('💾 [BACKUP] EOA Address:', address);
          console.log('💾 [BACKUP] Songs to backup:', mintedTracks.length);
          
          // Use smart account address (sama seperti Feed)
          const ownerAddress = smartAccountAddress || address;
          console.log('💾 [BACKUP] Using owner address:', ownerAddress);
          
          for (const song of mintedTracks) {
            try {
              const musicData = {
                owner: ownerAddress, // Use EOA address for consistency
                taskId: song.taskId || currentTaskId,
                title: song.title,
                audioUrl: song.audioUrl || '',
                imageUrl: song.imageUrl || '',
                prompt: prompt,
                style: song.genre.join(', '),
                lyrics: '',
                status: song.isMinted ? 2 : 1, // 2 = MINTED, 1 = COMPLETED
              };
              
              console.log(`💾 [BACKUP] Saving "${song.title}"...`, musicData);
              
              await somniaDatastreamServiceV3.saveGeneratedMusic(musicData, true);
              
              console.log(`✅ [BACKUP] Saved "${song.title}" to datastream`);
            } catch (backupError) {
              console.error(`⚠️ [BACKUP] Failed to backup "${song.title}":`, backupError);
              console.error(`⚠️ [BACKUP] Error details:`, backupError);
              // Continue with other songs even if one fails
            }
          }
          
          console.log('✅ [BACKUP] All songs backed up to Somnia Datastream');
        }
      } catch (error) {
        console.error('❌ [BACKUP] Datastream backup failed:', error);
        console.error('❌ [BACKUP] Error details:', error);
        // Don't fail the whole process if backup fails
      }
      
      setGenerationProgress({ stage: 'Generation completed!', percent: 100 });

      // Show results summary
      const successCount = uploadedTracks.filter(t => t.ipfsHash).length;
      const mintSuccessCount = mintedTracks.filter(t => t.isMinted).length;
      const totalCount = uploadedTracks.length;

      let successMessage = `Successfully generated ${totalCount} track(s)!`;
      if (successCount === totalCount) {
        successMessage += ` All tracks uploaded to IPFS.`;
      } else if (successCount > 0) {
        successMessage += ` ${successCount} uploaded to IPFS, ${failedUploads.length} using fallback URLs.`;
      } else {
        successMessage += ` Using original URLs as fallback.`;
      }

      if (mintSuccessCount > 0) {
        successMessage += ` ${mintSuccessCount} NFT(s) minted with FREE gas!`;
      }

      if (mintSuccessCount === totalCount && successCount === totalCount) {
        toast.success(`🎵🎨 Perfect! ${successMessage}`);
      } else if (mintSuccessCount > 0) {
        toast.success(`🎵 ${successMessage}`);
      } else {
        toast.success(`🎵 ${successMessage}`);
      }

      if (failedMints.length > 0) {
        toast.warning(`NFT minting failed for: ${failedMints.join(', ')}`);
      }

      setStep('result');

    } catch (error) {
      console.error('Generation failed:', error);

      let errorMessage = 'Generation failed. Please try again.';

      if (error.message.includes('SENSITIVE_WORD_ERROR')) {
        errorMessage = 'Your prompt contains sensitive content. Please modify your prompt.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please try again in a few minutes.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Generation is taking longer than expected. Please try again.';
      } else if (error.message.includes('IPFS')) {
        errorMessage = 'IPFS upload failed. Please check your configuration.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      setStep('prompt');
    } finally {
      setGenerationProgress({ stage: '', percent: 0 });
    }
  };

  const handleReset = () => {
    setStep('prompt');
    setPrompt('');
    setIsInstrumental(false);
    setVocalType('auto');
    setIsPlaying(null);
    setGeneratedSongs([]);
    setCurrentTaskId('');
  };

  const handleShareToFeed = async () => {
    if (!isAccountReady) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    if (generatedSongs.length === 0) {
      toast.error('No songs to share');
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Sharing to feed...');

    try {
      // Use the selected song as the main featured song
      const mainSong = generatedSongs[selectedSongForShare];
      const songCount = 1; // Only share one song at a time

      // Create rich post content with NFT information
      const artistName = profileData?.displayName || profileData?.username || mainSong.artist || 'HiBeats AI';
      
      // More natural and engaging post content
      let postContent = `Just dropped a new track! 🎵\n\n`;
      
      // Main song info - cleaner format
      postContent += `"${mainSong.title}"\n`;
      postContent += `${mainSong.genre.join(', ')} • ${Math.floor(mainSong.duration / 60)}:${String(Math.floor(mainSong.duration % 60)).padStart(2, '0')}\n`;

      // Add NFT badge if minted (subtle, not overwhelming)
      if (mainSong.isMinted && mainSong.tokenId && mainSong.tokenId !== 'pending') {
        postContent += `\n💎 Minted as NFT #${mainSong.tokenId}\n`;
      }

      // Add prompt as inspiration (if not too long)
      if (prompt && prompt.length < 100) {
        postContent += `\n💭 "${prompt}"\n`;
      }

      // Hashtags - more focused and relevant
      postContent += `\n#${mainSong.genre[0]?.replace(/\s+/g, '')} #AIMusic #Web3Music`;
      
      // Add HiBeats tag
      postContent += ` #HiBeats`;

      // Create comprehensive metadata for the post
      const postMetadata = JSON.stringify({
        type: 'music',
        contentType: 'ai_generated_music',
        title: mainSong.title,
        artist: artistName,
        genre: mainSong.genre,
        duration: mainSong.duration,
        songCount: songCount,

        // NFT Information
        isNFT: mainSong.isMinted || false,
        tokenId: mainSong.tokenId || null,
        mintTransactionHash: mainSong.mintTransactionHash || null,
        contractAddress: CONTRACT_ADDRESSES.songNFT,

        // IPFS Information
        ipfsHash: mainSong.ipfsHash,
        ipfsAudioHash: mainSong.ipfsAudioHash,
        ipfsImageHash: mainSong.ipfsImageHash,
        imageUrl: mainSong.imageUrl,
        audioUrl: mainSong.audioUrl,

        // Generation details
        taskId: mainSong.taskId,
        prompt: prompt,
        model: model,
        isInstrumental: isInstrumental,
        vocalType: vocalType,

        // All songs in this generation
        songs: generatedSongs.map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist,
          duration: song.duration,
          genre: song.genre,
          ipfsHash: song.ipfsHash,
          ipfsAudioHash: song.ipfsAudioHash,
          ipfsImageHash: song.ipfsImageHash,
          imageUrl: song.imageUrl,
          audioUrl: song.audioUrl,
          taskId: song.taskId,
          isMinted: song.isMinted,
          tokenId: song.tokenId,
          mintTransactionHash: song.mintTransactionHash
        })),

        // Metadata for social features
        timestamp: Date.now(),
        author: address,
        decentralized: !!mainSong.ipfsHash,
        blockchain: 'Somnia',

        // Attributes for NFT-like metadata
        attributes: [
          { trait_type: "Content Type", value: "AI Generated Music" },
          { trait_type: "Song Count", value: songCount },
          { trait_type: "Genre", value: mainSong.genre.join(', ') },
          { trait_type: "Duration", value: Math.round(mainSong.duration) },
          { trait_type: "IPFS Stored", value: !!mainSong.ipfsHash },
          { trait_type: "NFT Minted", value: !!mainSong.isMinted },
          { trait_type: "Blockchain", value: "Somnia Network" },
          { trait_type: "AI Model", value: model },
          { trait_type: "Instrumental", value: isInstrumental },
          { trait_type: "Vocal Type", value: vocalType }
        ]
      });

      // Create music metadata as JSON string (for mediaHashes field)
      // Only include the selected song
      const musicMetadata = {
        type: 'music',
        title: mainSong.title,
        artist: artistName,
        genre: mainSong.genre,
        duration: mainSong.duration,
        audioUrl: mainSong.audioUrl,
        imageUrl: mainSong.imageUrl,
        ipfsAudioHash: mainSong.ipfsAudioHash,
        ipfsImageHash: mainSong.ipfsImageHash,
        isNFT: mainSong.isMinted || false,
        tokenId: mainSong.tokenId,
        contractAddress: CONTRACT_ADDRESSES.songNFT,
      };

      // ⚡ V3: Create post data using datastream format
      const timestamp = Date.now();
      const postId = createPostId(smartAccountAddress, timestamp);
      
      const postData: Partial<PostDataV3> = {
        id: postId,
        author: smartAccountAddress,
        content: postContent.trim(),
        contentType: ContentType.MUSIC,
        mediaHashes: JSON.stringify(musicMetadata), // Store music metadata as JSON
        quotedPostId: 0,
        replyToId: 0,
        mentions: '',
        collectModule: '0x0000000000000000000000000000000000000000',
        collectPrice: 0,
        collectLimit: 0,
        collectCount: 0,
        isGated: false,
        referrer: '0x0000000000000000000000000000000000000000',
        nftTokenId: mainSong.tokenId ? Number(mainSong.tokenId) : 0,
        isDeleted: false,
        isPinned: false,
        timestamp,
        index: 0,
      };

      console.log('📤 Creating post on blockchain...', {
        contentLength: postContent.length,
        songCount,
        isNFT: mainSong.isMinted,
        postId
      });

      // ⚡ Publish to blockchain using V3 datastream service
      const postIdResult = await somniaDatastreamServiceV3.createPost(postData, true); // immediate = true

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      console.log('✅ Music shared to feed successfully:', {
        content: postContent.substring(0, 100) + '...',
        postId: postIdResult,
        isNFT: mainSong.isMinted,
        tokenId: mainSong.tokenId
      });

      // Show success message with NFT information
      const successMessage = mainSong.isMinted && mainSong.tokenId && mainSong.tokenId !== 'pending'
        ? `🎵🎨 NFT Music shared successfully! Token ID: ${mainSong.tokenId}`
        : '🎵 Music shared to your feed successfully!';

      toast.success(successMessage, {
        duration: 5000,
        description: 'Your music post is now live on the feed!'
      });

      // Don't close modal - let user close manually
      // onClose();

    } catch (error: any) {
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      console.error('❌ Failed to share NFT music to feed:', error);
      
      let errorMessage = 'Failed to share music to feed. Please try again.';
      if (error?.message) {
        errorMessage = `Failed to share: ${error.message}`;
      }
      
      toast.error(errorMessage, { duration: 5000 });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        // Check if user is artist when trying to open
        if (open && profileData && !profileData.isArtist) {
          setShowUpgradeModal(true);
          return;
        }
        
        // Prevent closing during generation
        if (!open && step === 'generating') {
          const confirmClose = window.confirm(
            '⚠️ Generation in Progress!\n\n' +
            'Closing this window will cancel the music generation and you will lose your progress.\n\n' +
            'Are you sure you want to close?'
          );
          if (!confirmClose) {
            return; // Don't close
          }
        }
        
        if (!open) onClose();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader className="pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-4 h-4 text-primary" />
            Create Song
          </DialogTitle>
        </DialogHeader>

        {step === 'prompt' && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ai' | 'upload')} className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                AI Generate
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload File
              </TabsTrigger>
            </TabsList>

            {/* AI Generate Tab */}
            <TabsContent value="ai" className="space-y-6 min-h-[500px]">
            {/* Service Status Warning */}
            {serviceStatus.checked && (!serviceStatus.sunoConfigured || !serviceStatus.ipfsConfigured) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Configuration Warning</span>
                </div>
                <div className="text-xs text-yellow-700 mt-1">
                  {!serviceStatus.sunoConfigured && (
                    <p>• Suno API key is not configured. Music generation may fail.</p>
                  )}
                  {!serviceStatus.ipfsConfigured && (
                    <p>• IPFS credentials are not configured. Files will use fallback URLs.</p>
                  )}
                </div>
                {serviceStatus.sunoConfigured && (
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={testApiConnection}
                      disabled={isTestingApi}
                      className="text-xs"
                    >
                      {isTestingApi ? 'Testing...' : 'Test API Connection'}
                    </Button>
                  </div>
                )}
              </div>
            )}
            {/* Description Input */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Describe your song *</Label>
              <Textarea
                id="prompt"
                placeholder="e.g., A chill electronic track with deep bass and atmospheric synths, perfect for late night coding sessions..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className={`min-h-[100px] resize-none ${
                  prompt.trim().length > 0 && prompt.trim().length < 10
                    ? 'border-red-500 focus:border-red-500'
                    : ''
                }`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {prompt.trim().length < 10 && prompt.trim().length > 0
                    ? 'Please provide more details (at least 10 characters)'
                    : 'Describe what kind of music you want to create'
                  }
                </span>
                <span>{prompt.length}/500</span>
              </div>
            </div>

            {/* Instrumental Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="instrumental"
                checked={isInstrumental}
                onCheckedChange={(checked) => {
                  const isChecked = checked as boolean;
                  setIsInstrumental(isChecked);
                  if (isChecked) {
                    setVocalType('none');
                  } else {
                    setVocalType('auto');
                  }
                }}
              />
              <Label htmlFor="instrumental" className="flex items-center gap-2 cursor-pointer">
                <Mic className="w-4 h-4" />
                +instrumental
              </Label>
            </div>

            {/* Vocal Type Selection */}
            {!isInstrumental && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Vocal Type</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      vocalType === 'auto'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setVocalType('auto')}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Auto</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">AI chooses best vocal style</p>
                  </div>

                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      vocalType === 'male'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setVocalType('male')}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Male</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Deep male vocals</p>
                  </div>

                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      vocalType === 'female'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setVocalType('female')}
                  >
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-pink-500" />
                      <span className="text-sm font-medium">Female</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Melodic female vocals</p>
                  </div>

                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      vocalType === 'none'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setVocalType('none')}
                  >
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Instrumental</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">No vocals</p>
                  </div>
                </div>
              </div>
            )}

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="model">AI Model</Label>
              <Select value={model} onValueChange={(value: 'V3_5' | 'V4' | 'V4_5') => setModel(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select AI model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="V3_5">V3.5 (Balanced)</SelectItem>
                  <SelectItem value="V4">V4 (Advanced)</SelectItem>
                  <SelectItem value="V4_5">V4.5 (Latest)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Info Text */}
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-1">
              {isInstrumental ? (
                <p>✓ Instrumental track only (no vocals) will be generated</p>
              ) : vocalType === 'auto' ? (
                <p>✓ Full song with AI-selected vocals will be generated</p>
              ) : vocalType === 'male' ? (
                <p>✓ Full song with deep male vocals will be generated</p>
              ) : vocalType === 'female' ? (
                <p>✓ Full song with melodic female vocals will be generated</p>
              ) : (
                <p>✓ Full song with vocals will be generated</p>
              )}
              <p className="mt-1">✓ Generation may take 1-3 minutes depending on complexity</p>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || prompt.trim().length < 10}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 relative overflow-hidden group"
              size="lg"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              <Wand2 className="w-5 h-5 animate-pulse" />
              Generate Song with AI
              <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-400 border-purple-500/30 px-2 py-0.5 text-xs font-bold">
                AI POWERED
              </Badge>
            </Button>
            </TabsContent>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-6 min-h-[500px]">
              <div className="space-y-4">
                {/* Audio File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="audioFile">Audio File *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => audioInputRef.current?.click()}>
                    <input
                      ref={audioInputRef}
                      type="file"
                      id="audioFile"
                      accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/flac"
                      onChange={handleAudioFileChange}
                      className="hidden"
                    />
                    {uploadedAudioFile ? (
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <File className="w-5 h-5" />
                        <span className="text-sm font-medium">{uploadedAudioFile.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(uploadedAudioFile.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload audio file</p>
                        <p className="text-xs text-gray-500 mt-1">MP3, WAV, OGG, FLAC (max 50MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cover Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="coverFile">Cover Artwork *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => coverInputRef.current?.click()}>
                    <input
                      ref={coverInputRef}
                      type="file"
                      id="coverFile"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={handleCoverFileChange}
                      className="hidden"
                    />
                    {uploadedCoverFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <img 
                          src={URL.createObjectURL(uploadedCoverFile)} 
                          alt="Cover preview" 
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <span className="text-sm font-medium text-primary">{uploadedCoverFile.name}</span>
                      </div>
                    ) : (
                      <div>
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Click to upload cover artwork</p>
                        <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (recommended: 3000x3000px, max 5MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Basic Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="uploadTitle">Song Title *</Label>
                      <Input
                        id="uploadTitle"
                        placeholder="e.g., Beautiful Dreams"
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="uploadArtist">Primary Artist *</Label>
                      <Input
                        id="uploadArtist"
                        placeholder="e.g., John Doe"
                        value={uploadArtist}
                        onChange={(e) => setUploadArtist(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="uploadFeaturing">Featuring Artists</Label>
                      <Input
                        id="uploadFeaturing"
                        placeholder="e.g., Jane Smith, Mike Ross"
                        value={uploadFeaturing}
                        onChange={(e) => setUploadFeaturing(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="uploadAlbum">Album / EP Name</Label>
                      <Input
                        id="uploadAlbum"
                        placeholder="e.g., Midnight Sessions"
                        value={uploadAlbum}
                        onChange={(e) => setUploadAlbum(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="uploadProducer">Producer</Label>
                      <Input
                        id="uploadProducer"
                        placeholder="e.g., DJ Producer"
                        value={uploadProducer}
                        onChange={(e) => setUploadProducer(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Genre and Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Genre & Details</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="uploadGenre">Genre *</Label>
                      <Select value={uploadGenre} onValueChange={setUploadGenre}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select genre" />
                        </SelectTrigger>
                        <SelectContent>
                          {genres.map((genre) => (
                            <SelectItem key={genre} value={genre.toLowerCase()}>
                              {genre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="uploadBPM">BPM</Label>
                      <Input
                        id="uploadBPM"
                        type="number"
                        placeholder="120"
                        value={uploadBPM}
                        onChange={(e) => setUploadBPM(e.target.value)}
                        min="1"
                        max="300"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="uploadReleaseDate">Release Date</Label>
                      <Input
                        id="uploadReleaseDate"
                        type="date"
                        value={uploadReleaseDate}
                        onChange={(e) => setUploadReleaseDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="uploadLanguage">Language</Label>
                      <Select value={uploadLanguage} onValueChange={setUploadLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                          <SelectItem value="german">German</SelectItem>
                          <SelectItem value="italian">Italian</SelectItem>
                          <SelectItem value="portuguese">Portuguese</SelectItem>
                          <SelectItem value="japanese">Japanese</SelectItem>
                          <SelectItem value="korean">Korean</SelectItem>
                          <SelectItem value="chinese">Chinese</SelectItem>
                          <SelectItem value="indonesian">Indonesian</SelectItem>
                          <SelectItem value="instrumental">Instrumental (No Lyrics)</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="uploadIsExplicit"
                      checked={uploadIsExplicit}
                      onCheckedChange={(checked) => setUploadIsExplicit(checked as boolean)}
                    />
                    <Label htmlFor="uploadIsExplicit" className="text-sm cursor-pointer">
                      Explicit Content (contains profanity or mature themes)
                    </Label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="uploadDescription">Description</Label>
                  <Textarea
                    id="uploadDescription"
                    placeholder="Tell your fans about this song... What inspired you? What's the story behind it?"
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">{uploadDescription.length}/500</p>
                </div>

                {/* Lyrics */}
                <div className="space-y-2">
                  <Label htmlFor="uploadLyrics">Lyrics (Optional)</Label>
                  <Textarea
                    id="uploadLyrics"
                    placeholder="Enter song lyrics here..."
                    value={uploadLyrics}
                    onChange={(e) => setUploadLyrics(e.target.value)}
                    className="min-h-[120px] resize-none font-mono text-sm"
                    maxLength={5000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Adding lyrics helps fans connect with your music • {uploadLyrics.length}/5000
                  </p>
                </div>

                {/* Copyright & Legal */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground">Copyright & Legal</h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="uploadCopyright">Copyright Notice</Label>
                    <Input
                      id="uploadCopyright"
                      placeholder={`© ${new Date().getFullYear()} ${uploadArtist || 'Your Name'}. All rights reserved.`}
                      value={uploadCopyright}
                      onChange={(e) => setUploadCopyright(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="uploadISRC">ISRC Code (Optional)</Label>
                    <Input
                      id="uploadISRC"
                      placeholder="e.g., USRC17607839"
                      value={uploadISRC}
                      onChange={(e) => setUploadISRC(e.target.value.toUpperCase())}
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground">
                      International Standard Recording Code for tracking and royalties
                    </p>
                  </div>
                </div>

                {/* Upload Button */}
                <Button
                  onClick={handleUploadAndMint}
                  disabled={!uploadedAudioFile || !uploadedCoverFile || !uploadTitle.trim() || !uploadArtist.trim() || !uploadGenre || isUploading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 relative overflow-hidden group"
                  size="lg"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Processing & Minting NFT...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 animate-pulse" />
                      Upload & Mint as NFT
                      <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 px-2 py-0.5 text-xs font-bold">
                        FREE GAS
                      </Badge>
                    </>
                  )}
                </Button>

                {/* Info */}
                <div className="text-xs bg-muted/50 border border-border p-4 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span>What happens next:</span>
                  </div>
                  <div className="space-y-1.5 text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <p>Audio & artwork uploaded to IPFS (decentralized storage)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <p>Complete metadata stored on-chain (Spotify-quality)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <p>NFT minted on Somnia blockchain (instant, sub-second)</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <p>5% royalty on secondary sales automatically enforced</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <p className="font-semibold text-primary">Gas fees sponsored by HiBeats - completely FREE 🎁</p>
                    </div>
                  </div>
                  <div className="pt-2 mt-2 border-t border-border">
                    <p className="text-primary font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Your music, your rights, forever on blockchain
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {step === 'generating' && (
          <div className="text-center py-12">
            <div className="relative mb-6">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Music className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 w-16 h-16 mx-auto border-2 border-primary/20 rounded-full animate-spin border-t-primary"></div>
            </div>
            <h3 className="text-lg font-semibold mb-2">Creating your song...</h3>
            <p className="text-muted-foreground mb-4">
              {generationProgress.stage}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-xs mx-auto">
              <Progress value={generationProgress.percent} className="w-full" />
              <p className="text-xs text-muted-foreground mt-2">
                {generationProgress.percent}% complete
              </p>
            </div>

            {/* Important Warning - Always show during generation */}
            <div className="mt-6 max-w-md mx-auto bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-500 text-xs font-bold">⚠️</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-red-400 mb-1">
                    ⚠️ Important: Keep This Window Open
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <strong>Do not close</strong> or navigate away during generation. Closing will cancel the process and you'll lose your progress.
                  </p>
                </div>
              </div>
            </div>

            {/* Generation Info - Show during different stages */}
            {generationProgress.stage.includes('Generating music') && (
              <div className="mt-4 max-w-md mx-auto bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-500 text-xs font-bold">🎵</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-purple-400 mb-1">
                      🎨 AI Music Generation in Progress
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Our AI is composing your unique track. This may take <strong>30-90 seconds</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}



            {/* Minting Info - Show when minting */}
            {generationProgress.stage.includes('Minting NFT') && (
              <div className="mt-6 max-w-md mx-auto bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-500 text-xs font-bold">🎨</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-blue-400 mb-1">
                      🎨 Minting Your NFT
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Creating your unique music NFT on <strong>Somnia blockchain</strong>.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚡ <strong>Gas-free</strong> and <strong>covered by Hibeats</strong> 
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-center">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-primary rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-4">
            {/* Header - Show instructions */}
            <div className="text-center pb-2">
              <p className="text-sm text-muted-foreground">
                {generatedSongs.length} track{generatedSongs.length > 1 ? 's' : ''} generated
              </p>
              {generatedSongs.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Select one track to share to feed
                </p>
              )}
            </div>

            {/* Generated Songs */}
            <div className="space-y-3">
              {generatedSongs.map((song, index) => (
                <Card key={song.id} className="border-border/30 hover:border-border/60 transition-all overflow-hidden">
                  <CardContent className="p-4">
                    {/* Song Header */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* Selection Radio Button */}
                      <div className="flex items-center pt-1">
                        <input
                          type="radio"
                          name="selectedSong"
                          checked={selectedSongForShare === index}
                          onChange={() => setSelectedSongForShare(index)}
                          className="w-4 h-4 text-primary cursor-pointer"
                          title="Select this song to share"
                        />
                      </div>
                      
                      {/* Album Art with Play Button */}
                      <div className="relative flex-shrink-0 group">
                        <div className="w-16 h-16 rounded-md overflow-hidden bg-muted">
                          {song.imageUrl ? (
                            <img
                              src={song.imageUrl}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="absolute inset-0 w-full h-full bg-black/60 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
                          onClick={() => setIsPlaying(isPlaying === song.id ? null : song.id)}
                        >
                          {isPlaying === song.id ? (
                            <Pause className="w-5 h-5 text-white" />
                          ) : (
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          )}
                        </Button>
                      </div>

                      {/* Song Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate mb-0.5">{song.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{song.artist}</p>
                        
                        {/* Tags */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 font-medium bg-pink-500/10 text-pink-600 border-0">
                            {song.genre.slice(0, 2).join(', ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {Math.floor(song.duration / 60)}:{String(Math.floor(song.duration % 60)).padStart(2, '0')}
                          </span>
                          
                          {/* Status Badges */}
                          {song.isMinted && song.mintTransactionHash ? (
                            <Badge className="text-[10px] px-1.5 py-0 h-5 gap-1 bg-purple-500/10 text-purple-600 border-purple-500/20">
                              <CheckCircle className="w-2.5 h-2.5" />
                              NFT Minted
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Audio Player */}
                    {song.audioUrl && (
                      <div className="mb-3">
                        <audio
                          controls
                          src={song.audioUrl}
                          className="w-full h-9"
                          preload="metadata"
                        />
                      </div>
                    )}

                    {/* Mint Button for unminted songs */}
                    {song.ipfsHash && !song.isMinted && (
                      <Button
                        onClick={async () => {
                          try {
                            const artistName = profileData?.displayName || profileData?.username || song.artist || `${address?.slice(0, 6)}...${address?.slice(-4)}` || 'Unknown Artist';
                            
                            const mintResult = await mintSongNFT({
                              to: address || '0x0000000000000000000000000000000000000000',
                              title: song.title,
                              artist: artistName,
                              genre: song.genre.join(', '),
                              duration: Math.round(song.duration),
                              ipfsAudioHash: song.ipfsAudioHash || '',
                              ipfsArtworkHash: song.ipfsImageHash || '',
                              royaltyPercentage: 500,
                              isExplicit: false,
                              metadataURI: `ipfs://${song.ipfsHash}`,
                              sunoId: song.id,
                              taskId: song.taskId,
                              prompt: prompt
                            });

                            if (mintResult.success) {
                              // Update the song in state with NFT data
                              setGeneratedSongs(prevSongs =>
                                prevSongs.map(s =>
                                  s.id === song.id
                                    ? {
                                        ...s,
                                        tokenId: mintResult.tokenId,
                                        isMinted: true,
                                        mintTransactionHash: mintResult.transactionHash
                                      }
                                    : s
                                )
                              );

                              toast.success(`🎵 NFT Minted! Token ID: ${mintResult.tokenId}`);
                              
                              // Update status in datastream
                              try {
                                const updatedSong = generatedSongs.find(s => s.id === song.id);
                                if (updatedSong) {
                                  await somniaDatastreamServiceV3.updateMusicStatus(
                                    Number(song.id),
                                    2, // MINTED status
                                    {
                                      id: Number(song.id),
                                      timestamp: Date.now(),
                                      owner: address || '0x0000000000000000000000000000000000000000',
                                      taskId: song.taskId || '',
                                      title: song.title,
                                      audioUrl: song.audioUrl || '',
                                      imageUrl: song.imageUrl || '',
                                      prompt: prompt,
                                      style: song.genre.join(', '),
                                      lyrics: '',
                                      status: 2
                                    }
                                  );
                                  console.log('✅ Updated mint status in datastream');
                                }
                              } catch (updateError) {
                                console.error('⚠️ Failed to update datastream status:', updateError);
                              }
                            } else {
                              toast.error(`Failed to mint NFT: ${mintResult.error}`);
                            }
                          } catch (error) {
                            console.error('Manual minting failed:', error);
                            toast.error('Failed to mint NFT. Please try again.');
                          }
                        }}
                        disabled={isMinting}
                        className="w-full h-9 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white gap-2 text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {isMinting ? 'Minting NFT...' : 'Mint as NFT (Gas-Free!)'}
                      </Button>
                    )}

                    {/* Success Message for Minted NFTs */}
                    {song.isMinted && song.mintTransactionHash && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-md p-3">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                              ✨ NFT Minted Successfully!
                            </p>
                            <p className="text-[10px] text-muted-foreground mb-2">
                              Gas fees sponsored by HiBeats - completely FREE for you! 💜
                            </p>
                            
                            <div className="flex flex-wrap gap-2 text-[10px]">
                              <a
                                href={`https://shannon-explorer.somnia.network/tx/${song.mintTransactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
                              >
                                View Transaction
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              
                              {song.tokenId && song.tokenId !== 'pending' && (
                                <a
                                  href={`https://shannon-explorer.somnia.network/token/${CONTRACT_ADDRESSES.songNFT}?a=${song.tokenId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline"
                                >
                                  View NFT Details
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={handleReset} className="flex-1 gap-2 h-9 text-xs">
                <RotateCcw className="w-3.5 h-3.5" />
                Generate Again
              </Button>
              <Button variant="outline" className="flex-1 gap-2 h-9 text-xs" onClick={() => {
                generatedSongs.forEach(song => {
                  if (song.audioUrl) {
                    const link = document.createElement('a');
                    link.href = song.audioUrl;
                    link.download = `${song.title}.mp3`;
                    link.click();
                  }
                });
              }}>
                <Download className="w-3.5 h-3.5" />
                Download All
              </Button>
              <Button 
                className="flex-1 gap-2 h-9 text-xs bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white" 
                onClick={handleShareToFeed}
              >
                <Share2 className="w-3.5 h-3.5" />
                Share to Feed
              </Button>
            </div>

            {/* Social Preview */}
            <Card className="border-border/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={profileData?.avatarHash ? `https://gateway.pinata.cloud/ipfs/${profileData.avatarHash}` : ''} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-[10px]">
                      {profileData?.displayName?.[0]?.toUpperCase() || profileData?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-xs truncate">
                        {profileData?.displayName || profileData?.username || 'You'}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        @{profileData?.username || 'username'}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs mb-2 leading-relaxed">
                  Just dropped a new track! 🎵
                  <br />
                  <span className="font-medium">"{generatedSongs[selectedSongForShare]?.title}"</span>
                  <br />
                  <span className="text-muted-foreground">
                    {generatedSongs[selectedSongForShare]?.genre.join(', ')} • {Math.floor(generatedSongs[selectedSongForShare]?.duration / 60)}:{String(Math.floor(generatedSongs[selectedSongForShare]?.duration % 60)).padStart(2, '0')}
                  </span>
                  {generatedSongs[selectedSongForShare]?.isMinted && generatedSongs[selectedSongForShare]?.tokenId && generatedSongs[selectedSongForShare]?.tokenId !== 'pending' && (
                    <>
                      <br />
                      <span className="text-purple-600 text-[10px]">💎 Minted as NFT #{generatedSongs[selectedSongForShare].tokenId}</span>
                    </>
                  )}
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-7 px-2">
                    <Heart className="w-3 h-3" />
                    <span className="text-[10px]">0</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-7 px-2">
                    <MessageCircle className="w-3 h-3" />
                    <span className="text-[10px]">0</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground h-7 px-2">
                    <Share2 className="w-3 h-3" />
                    <span className="text-[10px]">0</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Upgrade to Artist Modal - shown when non-artist tries to create music */}
    <ArtistUpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      onSuccess={() => {
        setShowUpgradeModal(false);
        // Refresh and allow user to create music
        window.location.reload();
      }}
    />
    </>
  );
};

export default CreateSongModal;