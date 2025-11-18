import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Music,
  Plus,
  X,
  Upload,
  Image as ImageIcon,
  Sparkles,
  ListMusic,
  Wand2
} from "lucide-react";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (playlistData: {
    title: string;
    description: string;
    cover: string;
    isPublic: boolean;
    creationMode?: 'manual' | 'ai';
    aiPrompt?: string;
    tracks?: any[];
  }) => void;
}

const CreatePlaylistModal = ({ isOpen, onClose, onCreate }: CreatePlaylistModalProps) => {
  const [creationMode, setCreationMode] = useState<'manual' | 'ai'>('manual');
  const [aiStep, setAiStep] = useState<'prompt' | 'generating' | 'result'>('prompt');
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverUrl, setCoverUrl] = useState("");
  // AI fields
  const [aiPrompt, setAiPrompt] = useState("");
  const [playlistName, setPlaylistName] = useState("");

  const handleAiGenerate = () => {
    if (!aiPrompt.trim()) return;
    setAiStep('generating');

    // Simulate AI generation
    setTimeout(() => {
      setAiStep('result');
    }, 4000);
  };

  const handleAiReset = () => {
    setAiStep('prompt');
    setAiPrompt('');
    setPlaylistName('');
  };

  const generatedTracks = [
    {
      id: 1,
      title: "Neon Dreams",
      artist: "Synthwave Collective",
      duration: "3:42",
      genre: "Synthwave",
      cover: "/api/placeholder/60/60"
    },
    {
      id: 2,
      title: "Midnight Groove",
      artist: "Jazz Fusion",
      duration: "4:15",
      genre: "Jazz",
      cover: "/api/placeholder/60/60"
    },
    {
      id: 3,
      title: "Urban Pulse",
      artist: "Beat Masters",
      duration: "2:58",
      genre: "Hip Hop",
      cover: "/api/placeholder/60/60"
    },
    {
      id: 4,
      title: "Ocean Waves",
      artist: "Ambient Sounds",
      duration: "5:20",
      genre: "Ambient",
      cover: "/api/placeholder/60/60"
    },
    {
      id: 5,
      title: "Electric Soul",
      artist: "Future Bass",
      duration: "3:28",
      genre: "Electronic",
      cover: "/api/placeholder/60/60"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (creationMode === 'manual' && !title.trim()) return;
    if (creationMode === 'ai' && aiStep !== 'result') return;

    const playlistData = {
      title: creationMode === 'manual' ? title.trim() : (playlistName.trim() || `AI Generated: ${aiPrompt.slice(0, 30)}...`),
      description: creationMode === 'manual' ? description.trim() : `Created with HiBeats AI based on: "${aiPrompt}"`,
      cover: coverUrl || "/api/placeholder/300/300",
      isPublic,
      creationMode,
      ...(creationMode === 'ai' && {
        aiPrompt: aiPrompt.trim(),
        tracks: generatedTracks
      })
    };

    onCreate(playlistData);

    // Reset form
    setCreationMode('manual');
    setAiStep('prompt');
    setTitle("");
    setDescription("");
    setIsPublic(true);
    setCoverUrl("");
    setAiPrompt("");
    setPlaylistName("");
  };

  const handleClose = () => {
    setCreationMode('manual');
    setAiStep('prompt');
    setTitle("");
    setDescription("");
    setIsPublic(true);
    setCoverUrl("");
    setAiPrompt("");
    setPlaylistName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Playlist
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs value={creationMode} onValueChange={(value) => setCreationMode(value as 'manual' | 'ai')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <Plus className="w-4 h-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Create with AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-6 mt-6">
            {/* Cover Upload */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 w-8 h-8 p-0 rounded-full"
                    onClick={() => {
                      // In a real app, this would open a file picker
                      const url = prompt("Enter cover image URL:");
                      if (url) setCoverUrl(url);
                    }}
                  >
                    <Upload className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">
                    Upload a cover image for your playlist
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const url = prompt("Enter cover image URL:");
                      if (url) setCoverUrl(url);
                    }}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Playlist Title *</Label>
              <Input
                id="title"
                placeholder="Enter playlist title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your playlist..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6 mt-6">
            {aiStep === 'prompt' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <ListMusic className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Describe Your Perfect Playlist</h3>
                  <p className="text-sm text-muted-foreground">
                    Tell us about the mood, genre, or theme you're looking for
                  </p>
                </div>

                {/* Playlist Name */}
                <div className="space-y-2">
                  <Label htmlFor="playlistName">Playlist Name (Optional)</Label>
                  <Input
                    id="playlistName"
                    placeholder="e.g., Late Night Coding Vibes"
                    value={playlistName}
                    onChange={(e) => setPlaylistName(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="aiPrompt">Describe your playlist</Label>
                  <Textarea
                    id="aiPrompt"
                    placeholder="e.g., A chill electronic playlist with deep bass and atmospheric synths, perfect for late night coding sessions. Mix of ambient and downtempo tracks..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleAiGenerate}
                  disabled={!aiPrompt.trim()}
                  className="w-full gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  Generate Playlist with AI
                </Button>
              </div>
            )}

            {aiStep === 'generating' && (
              <div className="text-center py-8">
                <div className="relative mb-6">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <ListMusic className="w-8 h-8 text-primary animate-pulse" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 mx-auto border-2 border-primary/20 rounded-full animate-spin border-t-primary"></div>
                </div>
                <h3 className="text-lg font-semibold mb-2">Creating your playlist...</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Our AI is curating the perfect tracks just for you
                </p>
                <div className="flex justify-center">
                  <div className="flex gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {aiStep === 'result' && (
              <div className="space-y-6">
                {/* Playlist Preview */}
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-start gap-4">
                    <img
                      src="/api/placeholder/80/80"
                      alt="Generated playlist"
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">
                        {playlistName || `AI Generated: ${aiPrompt.slice(0, 30)}...`}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Created with HiBeats AI • {generatedTracks.length} tracks
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {aiPrompt}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sample Tracks */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sample Tracks</Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {generatedTracks.slice(0, 3).map((track, index) => (
                      <div key={track.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                        <img
                          src={track.cover}
                          alt={track.title}
                          className="w-8 h-8 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {track.genre}
                        </Badge>
                      </div>
                    ))}
                    {generatedTracks.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        +{generatedTracks.length - 3} more tracks...
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleAiReset} className="flex-1 gap-2">
                    <Wand2 className="w-4 h-4" />
                    Try Again
                  </Button>
                  <Button onClick={() => setAiStep('prompt')} variant="outline" className="flex-1">
                    Edit Prompt
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Privacy Setting */}
        <div className="flex items-center justify-between mt-6">
          <div className="space-y-1">
            <Label>Privacy</Label>
            <p className="text-sm text-muted-foreground">
              {isPublic ? "Anyone can see this playlist" : "Only you can see this playlist"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {isPublic ? "Public" : "Private"}
            </span>
            <Switch
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          {creationMode === 'manual' && (
            <Button
              type="submit"
              disabled={!title.trim()}
              className="flex-1"
            >
              Create Playlist
            </Button>
          )}
          {creationMode === 'ai' && aiStep === 'result' && (
            <Button
              type="submit"
              className="flex-1"
            >
              Save AI Playlist
            </Button>
          )}
        </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlaylistModal;
