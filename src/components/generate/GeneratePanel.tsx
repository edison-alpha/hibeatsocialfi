// src/components/generate/GeneratePanel.tsx
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Music, Zap, Settings, Sparkles, Shuffle, Send, Bot, User, Loader2 } from "lucide-react";
import { useGeneratedMusicContext } from '../../contexts/GeneratedMusicContext';
import { SunoGenerateRequest } from '../../types/music';
import { toast } from 'sonner';
import { useCurrentUserProfile } from '@/hooks/useRealTimeProfile';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isGenerating?: boolean;
}

export const GeneratePanel = () => {
  const {
    generateMusic,
    isGenerating,
    progress,
    totalTracks
  } = useGeneratedMusicContext();

  const [musicDescription, setMusicDescription] = useState('');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [model, setModel] = useState<'V3_5' | 'V4' | 'V4_5'>('V4');
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [vocalGender, setVocalGender] = useState<'m' | 'f'>('m');

  // Quick inspiration prompts - infinite list
  const inspirationPrompts = [
    'Upbeat electronic dance music',
    'Chill lo-fi hip hop beats',
    'Epic orchestral cinematic',
    'Smooth jazz with saxophone',
    'Energetic rock with guitar',
    'Ambient meditation music',
    'Funky disco groove',
    'Dark atmospheric techno',
    'Acoustic folk ballad',
    'Heavy metal with drums',
    'Tropical house summer vibes',
    'Classical piano composition',
    'Reggae with steel drums',
    'Synthwave retro 80s',
    'Blues with harmonica',
    'Country with banjo',
    'K-pop energetic dance',
    'Trap with 808 bass',
    'Indie pop dreamy vocals',
    'Dubstep heavy drops',
    'Soulful R&B with vocals',
    'Punk rock fast tempo',
    'Bossa nova relaxing',
    'Gospel choir uplifting',
    'Grunge alternative rock',
    'Trance progressive beats',
    'Flamenco guitar passionate',
    'Hip hop boom bap',
    'New age spiritual',
    'Ska upbeat horns'
  ];

  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll inspiration - smooth infinite scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || isAutoScrollPaused || isGenerating) return;

    autoScrollIntervalRef.current = setInterval(() => {
      if (container.scrollLeft >= container.scrollWidth / 2) {
        // Reset to start seamlessly
        container.scrollLeft = 0;
      } else {
        container.scrollLeft += 1;
      }
    }, 30); // Smooth scroll speed

    return () => {
      if (autoScrollIntervalRef.current) {
        clearInterval(autoScrollIntervalRef.current);
      }
    };
  }, [isAutoScrollPaused, isGenerating]);

  // Handle instrumental toggle - clear lyrics when enabled
  const handleInstrumentalChange = (checked: boolean) => {
    setInstrumental(checked);
    if (checked) {
      setLyrics(''); // Clear lyrics when instrumental is enabled
    }
  };

  // Handle inspiration selection
  const handleInspirationClick = (prompt: string) => {
    if (prompt.length <= 200) {
      setMusicDescription(prompt);
      // Pause auto-scroll briefly when user clicks
      setIsAutoScrollPaused(true);
      setTimeout(() => setIsAutoScrollPaused(false), 5000); // Resume after 5 seconds
    }
  };

  // Handle mouse interaction with scroll container
  const handleMouseEnter = () => {
    setIsAutoScrollPaused(true);
  };

  const handleMouseLeave = () => {
    setIsAutoScrollPaused(false);
  };

  // Shuffle and pick random prompt
  const handleShuffle = () => {
    const randomIndex = Math.floor(Math.random() * inspirationPrompts.length);
    const randomPrompt = inspirationPrompts[randomIndex];
    setMusicDescription(randomPrompt);
    toast.success('Random inspiration selected!');
  };

  const handleGenerate = async () => {
    if (!musicDescription.trim()) {
      toast.error('Please enter a music description');
      return;
    }

    if (musicDescription.length > 200) {
      toast.error('Music description must be 200 characters or less');
      return;
    }

    const params: SunoGenerateRequest = {
      prompt: isAdvancedMode ? lyrics || musicDescription : musicDescription,
      customMode: isAdvancedMode,
      instrumental,
      model,
      style: isAdvancedMode ? musicDescription : '',
      title: isAdvancedMode ? title : undefined,
      lyrics: isAdvancedMode && !instrumental && lyrics ? lyrics : undefined,
      vocalGender: isAdvancedMode && !instrumental ? vocalGender : undefined
    };

    try {
      await generateMusic(params);
      // Reset form on success
      setMusicDescription('');
      setTitle('');
      setLyrics('');
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          AI Music Generator
        </CardTitle>
      </CardHeader>
      
      {/* Scrollable Content */}
      <CardContent className="flex-1 overflow-y-auto space-y-4 pb-4">
        {/* Music Description / Style */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="music-description" className="text-sm font-medium">
              {isAdvancedMode ? 'Style / Tags *' : 'Music Description *'}
            </Label>
            <span className={`text-xs ${musicDescription.length > 200 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {musicDescription.length}/200
            </span>
          </div>
          <Textarea
            id="music-description"
            placeholder={
              isAdvancedMode
                ? "Music style and tags (e.g., 'Electronic, Dance, Upbeat, Synthesizers, Energetic')"
                : "Describe the music you want to create (e.g., 'Upbeat electronic dance music with synthesizers and energetic beats')"
            }
            value={musicDescription}
            onChange={(e) => {
              const value = e.target.value;
              if (value.length <= 200) {
                setMusicDescription(value);
              }
            }}
            rows={4}
            disabled={isGenerating}
            className="mt-1"
            maxLength={200}
          />
          {isAdvancedMode ? (
            <p className="text-xs text-muted-foreground mt-1">
              In Advanced Mode, this field defines the music style, genre, mood, and instruments
            </p>
          ) : (
            musicDescription.length > 180 && (
              <p className="text-xs text-muted-foreground mt-1">
                {200 - musicDescription.length} characters remaining
              </p>
            )
          )}
        </div>

        {/* Title Field - Shown when Advanced Mode is active */}
        {isAdvancedMode && (
          <div>
            <Label htmlFor="song-title" className="text-sm font-medium">
              Title (Optional)
            </Label>
            <Textarea
              id="song-title"
              placeholder="Enter a custom song title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              disabled={isGenerating}
              className="mt-1"
            />
          </div>
        )}

        {/* Quick Inspiration - Infinite Scroll */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-primary" />
              Quick Inspiration
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShuffle}
              disabled={isGenerating}
              className="h-7 px-2 text-xs gap-1"
            >
              <Shuffle className="w-3 h-3" />
              Shuffle
            </Button>
          </div>
          <div className="relative">
            <div 
              ref={scrollContainerRef}
              className="overflow-x-auto scrollbar-hide"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <div className="flex gap-2 pb-2">
                {/* Duplicate prompts for seamless infinite scroll */}
                {[...inspirationPrompts, ...inspirationPrompts].map((prompt, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/20 hover:border-primary transition-all flex-shrink-0 text-xs px-3 py-1 whitespace-nowrap"
                    onClick={() => handleInspirationClick(prompt)}
                  >
                    {prompt}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Model Selection */}
        <div>
          <Label className="text-sm font-medium">AI Model</Label>
          <Select
            value={model}
            onValueChange={(value: 'V3_5' | 'V4' | 'V4_5') => setModel(value)}
            disabled={isGenerating}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="V3_5">Suno V3.5 (Balanced)</SelectItem>
              <SelectItem value="V4">Suno V4 (Advanced)</SelectItem>
              <SelectItem value="V4_5">Suno V4.5 (Latest)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <Label className="text-sm font-medium">Advanced Mode</Label>
          </div>
          <Switch
            checked={isAdvancedMode}
            onCheckedChange={setIsAdvancedMode}
            disabled={isGenerating}
          />
        </div>

        {/* Advanced Options */}
        {isAdvancedMode && (
          <div className="space-y-4 p-4 border border-primary/20 rounded-lg bg-muted/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Advanced Options</span>
            </div>

            <div>
              <Label className="text-sm">Lyrics (Optional)</Label>
              <Textarea
                placeholder="Enter custom lyrics for your song..."
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={4}
                disabled={isGenerating || instrumental}
                className="mt-1"
              />
              {instrumental && (
                <p className="text-xs text-muted-foreground mt-1">
                  Lyrics are disabled when Instrumental Only is enabled
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm">Vocal Gender</Label>
                <Select
                  value={vocalGender}
                  onValueChange={(value: 'm' | 'f') => setVocalGender(value)}
                  disabled={isGenerating || instrumental}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Male</SelectItem>
                    <SelectItem value="f">Female</SelectItem>
                  </SelectContent>
                </Select>
                {instrumental && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Disabled for instrumental music
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Instrumental Only</Label>
                <Switch
                  checked={instrumental}
                  onCheckedChange={handleInstrumentalChange}
                  disabled={isGenerating}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        {totalTracks > 0 && (
          <div className="flex justify-center">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Music className="w-3 h-3" />
              {totalTracks} track{totalTracks !== 1 ? 's' : ''} generated
            </Badge>
          </div>
        )}
      </CardContent>

      {/* Fixed Bottom Section */}
      <div className="flex-shrink-0 border-t bg-background p-4 space-y-4">
        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={!musicDescription.trim() || isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 animate-pulse" />
              Generating...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4" />
              Generate Music
            </div>
          )}
        </Button>

        {/* Progress */}
        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress.percent} className="w-full" />
            <div className="text-sm text-center text-gray-600 dark:text-gray-400">
              {progress.stage}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};