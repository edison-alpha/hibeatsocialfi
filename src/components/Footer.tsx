import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Music,
  Users,
  Zap,
  Shield,
  Headphones,
  TrendingUp,
  Star,
  Download,
  Share2,
  Heart,
  PlayCircle,
  Globe
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-muted/30 border-t border-border/20">
      {/* Main Footer Content */}
      <div className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Platform Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Music className="w-6 h-6 text-primary" />
              <span className="font-clash font-semibold text-lg">HiBeats</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The ultimate music social platform where creators and fans connect through AI-powered music creation and blockchain technology.
            </p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                AI-Powered
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Blockchain
              </Badge>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="font-clash font-semibold text-lg">Features</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <PlayCircle className="w-4 h-4 text-primary" />
                <span>AI Music Creation</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span>Social Music Feed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Download className="w-4 h-4 text-primary" />
                <span>NFT Marketplace</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Share2 className="w-4 h-4 text-primary" />
                <span>Cross-Platform Sharing</span>
              </div>
            </div>
          </div>

          {/* Community */}
          <div className="space-y-4">
            <h3 className="font-clash font-semibold text-lg">Community</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-primary" />
                <span>10K+ Active Users</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Music className="w-4 h-4 text-primary" />
                <span>50K+ Tracks Created</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 text-primary" />
                <span>4.8/5 User Rating</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Globe className="w-4 h-4 text-primary" />
                <span>Global Community</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-clash font-semibold text-lg">Quick Links</h3>
            <div className="space-y-2">
              <Button variant="link" className="p-0 h-auto text-sm justify-start">
                Create Music
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm justify-start">
                Explore Feed
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm justify-start">
                NFT Marketplace
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm justify-start">
                Artist Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <Card className="border-border/30 bg-background/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-clash font-semibold text-primary mb-1">10K+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-background/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-clash font-semibold text-primary mb-1">50K+</div>
              <div className="text-sm text-muted-foreground">Tracks Created</div>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-background/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-clash font-semibold text-primary mb-1">1M+</div>
              <div className="text-sm text-muted-foreground">Streams</div>
            </CardContent>
          </Card>
          <Card className="border-border/30 bg-background/50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-clash font-semibold text-primary mb-1">4.8</div>
              <div className="text-sm text-muted-foreground">User Rating</div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center mb-12">
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
            <CardContent className="p-8">
              <h3 className="font-clash font-semibold text-2xl mb-4">
                Ready to Create Your Music?
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Join thousands of creators using AI to bring their musical visions to life.
                Start creating, sharing, and earning today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="font-clash font-semibold px-8">
                  Start Creating
                </Button>
                <Button size="lg" variant="outline" className="font-clash font-semibold px-8">
                  Explore Music
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border/20">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>© 2025 HiBeats. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Button variant="link" className="p-0 h-auto text-sm">
                Privacy Policy
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm">
                Terms of Service
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm">
                Support
              </Button>
              <Button variant="link" className="p-0 h-auto text-sm">
                Contact
              </Button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;