import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Instagram,
  Twitter,
  Music,
  Apple,
  ExternalLink,
  Upload,
  ArrowLeft,
  Save
} from "lucide-react";
import { useSequence } from "@/contexts/SequenceContext";
import { ipfsService } from "@/services/ipfsService";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";

interface ProfileCreationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: ProfileData) => void;
  onBack: () => void;
}

interface ProfileData {
  name: string;
  avatar: string;
  socialLinks: {
    instagram: string;
    twitter: string;
    bandcamp: string;
    soundcloud: string;
    appleMusic: string;
    spotify: string;
    other: string;
  };
}

const ProfileCreation = ({ isOpen, onClose, onSave, onBack }: ProfileCreationProps) => {
  const [step, setStep] = useState<'name' | 'profile'>('name');
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [socialLinks, setSocialLinks] = useState({
    instagram: "",
    twitter: "",
    bandcamp: "",
    soundcloud: "",
    appleMusic: "",
    spotify: "",
    other: ""
  });
  const [isCreating, setIsCreating] = useState(false);

  const { createProfile, updateSocialLinks, isAccountReady, smartAccountAddress, getProfile } = useSequence();
  const { toast } = useToast();

  const handleContinue = () => {
    if (name.trim()) {
      setStep('profile');
    }
  };

  const handleBackToName = () => {
    setStep('name');
  };

  const handleBackToLogin = () => {
    // Profile creation is mandatory - don't allow going back to login
    toast({
      title: "Profile Required",
      description: "You must create a profile to continue using HiBeats.",
      variant: "destructive",
    });
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !isAccountReady || !smartAccountAddress) return;

    setIsCreating(true);
    console.log('Creating profile with name:', name.trim());
    console.log('Smart account address:', smartAccountAddress);
    
    try {
      // Check if profile already exists
      try {
        const existingProfile = await getProfile(smartAccountAddress);
        if (existingProfile && existingProfile.userAddress) {
          toast({
            title: "Profile Already Exists",
            description: `You already have a profile with username: ${existingProfile.username}. Refreshing...`,
            variant: "default",
          });
          
          // Profile exists, just close the modal and let app load the profile
          setTimeout(() => {
            window.location.reload();
          }, 1500);
          return;
        }
      } catch (err) {
        // Profile doesn't exist - continue with creation
        console.log('No existing profile found, proceeding with creation');
      }
      
      // Upload avatar to IPFS if provided
      let avatarHash = "";
      if (avatar && avatar.startsWith('data:')) {
        // Convert data URL to File
        const response = await fetch(avatar);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });

        const uploadResult = await ipfsService.uploadFile(file);
        avatarHash = uploadResult.IpfsHash;
      }

      // Generate username from name (lowercase, no spaces, alphanumeric only)
      const username = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Validate username length
      if (username.length < 3) {
        toast({
          title: "Username Too Short",
          description: "Username must be at least 3 characters (alphanumeric only)",
          variant: "destructive",
        });
        return;
      }
      
      if (username.length > 30) {
        toast({
          title: "Username Too Long",
          description: "Username cannot exceed 30 characters",
          variant: "destructive",
        });
        return;
      }

      // Create profile on blockchain
      // Start as regular listener (Web2/Web3 standard - upgrade to artist later)
      await createProfile(
        username,
        name.trim(),
        "", // bio - empty for now
        avatarHash,
        "", // location - empty for now
        false // isArtist - false by default (can upgrade later)
      );

      // Clear profile cache to force refresh
      profileService.clearProfileCache();

      // Update social links if any are provided
      const hasSocialLinks = Object.values(socialLinks).some(link => link.trim());
      if (hasSocialLinks) {
        // Map component social links to contract format
        await updateSocialLinks(
          socialLinks.instagram,
          socialLinks.twitter,
          "", // youtube - not in component
          socialLinks.spotify,
          socialLinks.soundcloud,
          socialLinks.bandcamp,
          "", // discord - not in component
          ""  // telegram - not in component
        );
      }

      toast({
        title: "Profile Created!",
        description: "Your profile has been created successfully.",
      });

      const profileData: ProfileData = {
        name: name.trim(),
        avatar,
        socialLinks
      };

      console.log('Profile created successfully, calling onSave');
      onSave(profileData);
      console.log('Closing profile creation modal');
      onClose();

    } catch (error) {
      console.error('Failed to create profile:', error);
      
      // Check for specific error messages
      let errorMessage = "An error occurred while creating your profile.";
      
      if (error instanceof Error) {
        const errorStr = error.message.toLowerCase();
        
        if (errorStr.includes('profile already exists')) {
          errorMessage = "A profile already exists for this account. Please refresh the page.";
        } else if (errorStr.includes('username taken')) {
          errorMessage = `The username "${name.toLowerCase().replace(/[^a-z0-9]/g, '')}" is already taken. Please choose a different name.`;
        } else if (errorStr.includes('username too short')) {
          errorMessage = "Username must be at least 3 characters long (letters and numbers only).";
        } else if (errorStr.includes('username too long')) {
          errorMessage = "Username cannot exceed 30 characters.";
        } else if (errorStr.includes('simulation failed') || errorStr.includes('execution reverted')) {
          errorMessage = "Transaction failed. This usually means:\n1. A profile already exists for this account, or\n2. The username is already taken\n\nPlease try refreshing the page or using a different username.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Profile Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const updateSocialLink = (platform: keyof typeof socialLinks, value: string) => {
    setSocialLinks(prev => ({
      ...prev,
      [platform]: value
    }));
  };

  const socialPlatforms = [
    {
      key: "instagram" as const,
      label: "INSTAGRAM",
      placeholder: "instagram.com/you",
      icon: Instagram,
      prefix: "instagram.com/"
    },
    {
      key: "twitter" as const,
      label: "TWITTER",
      placeholder: "x.com/you",
      icon: Twitter,
      prefix: "x.com/"
    },
    {
      key: "bandcamp" as const,
      label: "BANDCAMP",
      placeholder: "you.bandcamp.com",
      icon: Music,
      prefix: ""
    },
    {
      key: "soundcloud" as const,
      label: "SOUNDCLOUD",
      placeholder: "soundcloud.com/you",
      icon: Music,
      prefix: "soundcloud.com/"
    },
    {
      key: "appleMusic" as const,
      label: "APPLE MUSIC",
      placeholder: "music.apple.com/us/artist/you/id",
      icon: Apple,
      prefix: ""
    },
    {
      key: "spotify" as const,
      label: "SPOTIFY",
      placeholder: "open.spotify.com/artist/you",
      icon: Music,
      prefix: "open.spotify.com/artist/"
    },
    {
      key: "other" as const,
      label: "OTHER",
      placeholder: "you.com",
      icon: ExternalLink,
      prefix: ""
    }
  ];

  return (
    <Dialog open={isOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Create Profile</DialogTitle>
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-clash font-semibold">
            Create your profile
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-8">
          {step === 'name' ? (
            /* Name Step */
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-3xl font-clash font-semibold mb-2">What's your name?</h2>
                <p className="text-muted-foreground">Let's get to know you better</p>
              </div>
              
              <div className="max-w-md mx-auto">
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xl py-4 text-center"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleContinue}
                disabled={!name.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-lg"
              >
                Continue
              </Button>
            </div>
          ) : (
            /* Profile Step */
            <>
              {/* Avatar Upload */}
              <div className="space-y-4">
                <Label className="text-lg font-medium">Profile Picture</Label>
                <div className="flex items-center gap-6">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                      {name.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <Label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Avatar
                    </Label>
                    <p className="text-sm text-muted-foreground mt-2">
                      JPG, PNG or GIF. Max size 5MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="space-y-4">
                <Label className="text-lg font-medium">Connect your profiles</Label>
                <div className="space-y-3">
                  {socialPlatforms.map((platform) => {
                    const Icon = platform.icon;
                    return (
                      <div key={platform.key} className="flex items-center gap-3">
                        <div className="w-32 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Icon className="w-4 h-4" />
                          {platform.label}
                        </div>
                        <div className="flex-1">
                          <Input
                            placeholder={platform.placeholder}
                            value={socialLinks[platform.key]}
                            onChange={(e) => updateSocialLink(platform.key, e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBackToLogin}
                  className="flex-1 gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || isCreating || !isAccountReady}
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                >
                  <Save className="w-4 h-4" />
                  {isCreating ? "Creating Profile..." : !isAccountReady ? "Initializing..." : "Save Profile"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileCreation;