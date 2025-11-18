import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  Search,
  Calendar,
  User,
  Eye
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

const LinerNotes = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [];

  const linerNotes = [
    {
      id: 1,
      title: "The Making of Cyber Dreams",
      artist: "Synthwave Collective",
      avatar: "SC",
      excerpt: "An intimate look into the creative process behind our latest synthwave masterpiece. From initial concept to final mix, discover the journey that brought Cyber Dreams to life.",
      content: "It all started with a late-night synth session in our Berlin studio. The year was 2024, and we were experimenting with new AI-assisted composition techniques. What began as a simple chord progression evolved into a full-blown cyberpunk anthem that captured the essence of our generation's digital dreams...",
      readTime: "5 min read",
      cover: album1,
      date: "2 days ago",
      category: "behind-scenes",
      likes: 1247,
      comments: 89,
      views: 15420,
      tags: ["synthwave", "production", "ai-assisted"],
      featured: true
    },
    {
      id: 2,
      title: "Exploring AI Music Generation",
      artist: "HiBeats Team",
      avatar: "HT",
      excerpt: "How artificial intelligence is revolutionizing music creation and what it means for artists in the modern era.",
      content: "The landscape of music production has been forever changed by artificial intelligence. From melody generation to mixing assistance, AI tools are becoming indispensable in the creative process. But what does this mean for human artists? Are we witnessing the dawn of a new creative renaissance, or the beginning of something more profound?",
      readTime: "8 min read",
      cover: album2,
      date: "1 week ago",
      category: "ai-music",
      likes: 2156,
      comments: 156,
      views: 28900,
      tags: ["ai", "technology", "future"],
      featured: true
    },
    {
      id: 3,
      title: "From Garage to Global: My Journey",
      artist: "Jazz Fusion",
      avatar: "JF",
      excerpt: "A personal story of transformation, from bedroom producer to international artist.",
      content: "Five years ago, I was just another musician with a dream and a laptop. Today, I'm touring the world and collaborating with artists I once idolized. This is the story of how persistence, community, and a little bit of luck turned my passion into a career...",
      readTime: "6 min read",
      cover: album3,
      date: "3 days ago",
      category: "artist-stories",
      likes: 892,
      comments: 67,
      views: 12300,
      tags: ["journey", "inspiration", "success"],
      featured: false
    },
    {
      id: 4,
      title: "The Art of Sound Design",
      artist: "Ambient Sounds",
      avatar: "AS",
      excerpt: "Mastering the subtle craft of creating immersive audio environments.",
      content: "Sound design is often overlooked in music production, but it's the foundation of truly memorable tracks. Whether you're crafting ambient soundscapes or adding texture to electronic beats, understanding the principles of sound design can elevate your music to new heights...",
      readTime: "7 min read",
      cover: album4,
      date: "5 days ago",
      category: "production",
      likes: 1456,
      comments: 98,
      views: 18700,
      tags: ["sound-design", "production", "ambient"],
      featured: false
    },
    {
      id: 5,
      title: "Collaborating in the Digital Age",
      artist: "Beat Masters",
      avatar: "BM",
      excerpt: "How remote collaboration tools are changing the way musicians work together.",
      content: "The pandemic forced us to adapt, but what emerged was a new way of creating music that transcends geographical boundaries. From cloud-based DAWs to real-time collaboration platforms, discover how technology is bringing musicians closer together than ever before...",
      readTime: "4 min read",
      cover: album1,
      date: "1 week ago",
      category: "ai-music",
      likes: 734,
      comments: 45,
      views: 9200,
      tags: ["collaboration", "remote", "technology"],
      featured: false
    },
    {
      id: 6,
      title: "Finding Your Unique Sound",
      artist: "Digital Artists",
      avatar: "DA",
      excerpt: "Developing a signature style in an era of infinite possibilities.",
      content: "With so many tools and influences available, finding your unique voice can feel overwhelming. But your authentic sound is what will connect with listeners on a deeper level. Here's how to discover and develop the musical identity that's uniquely yours...",
      readTime: "9 min read",
      cover: album2,
      date: "2 weeks ago",
      category: "artist-stories",
      likes: 1892,
      comments: 134,
      views: 22100,
      tags: ["identity", "style", "authenticity"],
      featured: true
    },
    {
      id: 7,
      title: "The Evolution of Electronic Music",
      artist: "Neon Collective",
      avatar: "NC",
      excerpt: "Tracing the history and future of electronic music production.",
      content: "From the pioneering work of Kraftwerk to the AI-assisted compositions of today, electronic music has undergone a remarkable transformation. Join us as we explore the key moments that shaped this genre and speculate on what's coming next...",
      readTime: "10 min read",
      cover: album3,
      date: "3 weeks ago",
      category: "behind-scenes",
      likes: 2156,
      comments: 178,
      views: 31200,
      tags: ["history", "electronic", "evolution"],
      featured: true
    },
    {
      id: 8,
      title: "Mixing Secrets Revealed",
      artist: "Fusion Labs",
      avatar: "FL",
      excerpt: "Professional mixing techniques that you can apply to your own productions.",
      content: "A great mix can turn a good track into a masterpiece. Learn the techniques used by professional engineers, from frequency balancing to creative use of effects. These insights will help you achieve professional-sounding results in your own productions...",
      readTime: "6 min read",
      cover: album4,
      date: "4 days ago",
      category: "production",
      likes: 1234,
      comments: 87,
      views: 15600,
      tags: ["mixing", "production", "techniques"],
      featured: false
    },
    {
      id: 9,
      title: "Building a Music Community",
      artist: "Soul Syndicate",
      avatar: "SS",
      excerpt: "The importance of community in sustaining a creative career.",
      content: "Music is often seen as a solitary pursuit, but the reality is that community plays a crucial role in artistic development and career sustainability. Whether it's online forums, local scenes, or collaborative projects, discover how building connections can enrich your musical journey...",
      readTime: "5 min read",
      cover: album1,
      date: "1 week ago",
      category: "artist-stories",
      likes: 967,
      comments: 72,
      views: 11800,
      tags: ["community", "networking", "support"],
      featured: false
    },
    {
      id: 10,
      title: "The Future of Music Distribution",
      artist: "HiBeats Team",
      avatar: "HT",
      excerpt: "How blockchain and NFTs are reshaping music distribution.",
      content: "Traditional music distribution models are being challenged by new technologies. Blockchain, NFTs, and decentralized platforms offer artists unprecedented control over their work and direct access to fans. But what does this mean for the future of the music industry?",
      readTime: "7 min read",
      cover: album2,
      date: "2 weeks ago",
      category: "ai-music",
      likes: 1789,
      comments: 145,
      views: 25600,
      tags: ["blockchain", "nft", "distribution"],
      featured: true
    },
    {
      id: 11,
      title: "Overcoming Creative Blocks",
      artist: "Tranquil Waves",
      avatar: "TW",
      excerpt: "Strategies for breaking through creative barriers and maintaining inspiration.",
      content: "Every artist faces creative blocks, but learning to overcome them is what separates the amateurs from the professionals. From changing your environment to experimenting with new techniques, discover practical strategies for keeping your creative flow alive...",
      readTime: "4 min read",
      cover: album3,
      date: "6 days ago",
      category: "artist-stories",
      likes: 1456,
      comments: 98,
      views: 18900,
      tags: ["creativity", "inspiration", "blocks"],
      featured: false
    },
    {
      id: 12,
      title: "Mastering Live Performance",
      artist: "Urban Flow",
      avatar: "UF",
      excerpt: "Tips for taking your music from the studio to the stage.",
      content: "Live performance is a different beast entirely from studio production. Learn how to adapt your tracks for live settings, engage audiences, and create memorable experiences. Whether you're playing intimate venues or large festivals, these techniques will help you shine...",
      readTime: "8 min read",
      cover: album4,
      date: "1 week ago",
      category: "behind-scenes",
      likes: 1123,
      comments: 76,
      views: 14200,
      tags: ["live", "performance", "stage"],
      featured: false
    }
  ];

  const filteredNotes = linerNotes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         note.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-clash font-semibold text-3xl mb-1">Liner Notes</h1>
            <p className="text-muted-foreground text-base">Stories, insights, and behind-the-scenes content from our artists</p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search liner notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Featured Note */}
          {filteredNotes.find(note => note.featured) && (
            <div className="mb-12">
              <h2 className="font-clash font-semibold text-xl mb-6">Featured Story</h2>
              {(() => {
                const featuredNote = filteredNotes.find(note => note.featured);
                if (!featuredNote) return null;
                return (
                  <Card className="overflow-hidden border-0 bg-transparent shadow-none">
                    <div className="relative h-96 lg:h-[500px] rounded-2xl overflow-hidden">
                      <img
                        src={featuredNote.cover}
                        alt={featuredNote.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>

                      {/* Content Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                        <div className="max-w-4xl">
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="w-12 h-12 border-2 border-white/20">
                              <AvatarImage src="" />
                              <AvatarFallback className="bg-white/20 text-white font-semibold">
                                {featuredNote.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white">{featuredNote.artist}</p>
                              <p className="text-sm text-white/80">{featuredNote.date}</p>
                            </div>
                          </div>

                          <h3 className="font-clash font-semibold text-3xl lg:text-4xl mb-4 leading-tight">{featuredNote.title}</h3>
                          <p className="text-white/90 text-lg mb-6 line-clamp-2 max-w-2xl">{featuredNote.excerpt}</p>

                          <div className="flex flex-wrap items-center gap-6 text-sm text-white/80 mb-8">
                            <span className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {featuredNote.readTime}
                            </span>
                            <span className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              {formatNumber(featuredNote.views)} views
                            </span>
                            <span className="flex items-center gap-2">
                              <Heart className="w-4 h-4" />
                              {formatNumber(featuredNote.likes)} likes
                            </span>
                            <span className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              {featuredNote.comments} comments
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                                {featuredNote.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-6">
                            <Button className="bg-white text-black hover:bg-white/90 gap-2 px-6 py-3 text-base" asChild>
                              <Link to={`/liner-note-detail/${featuredNote.id}`}>
                                <BookOpen className="w-5 h-5" />
                                Read Full Story
                              </Link>
                            </Button>
                            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 gap-2 px-6 py-3 text-base">
                              <Share2 className="w-5 h-5" />
                              Share
                            </Button>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2">
                            {featuredNote.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="bg-white/10 text-white/90 border-white/20 text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Featured Badge - REMOVED */}
                      {/* <div className="absolute top-6 left-6">
                        <Badge className="bg-white/90 text-black text-sm px-3 py-1 rounded-full font-medium">
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Featured
                        </Badge>
                      </div> */}
                    </div>
                  </Card>
                );
              })()}
            </div>
          )}

          {/* All Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="group hover:shadow-lg transition-all duration-300 border-border/20 bg-card/50 backdrop-blur-sm overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                  <div className="relative">
                    <img
                      src={note.cover}
                      alt={note.title}
                      className="w-full h-40 object-cover"
                    />
                    {/* Featured Badge - REMOVED */}
                    {/* {note.featured && (
                      <Badge className="absolute top-3 left-3 bg-white/90 text-foreground text-xs px-2 py-1 rounded-full">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )} */}
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                          {note.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{note.artist}</p>
                        <p className="text-xs text-muted-foreground">{note.date}</p>
                      </div>
                    </div>

                    <h3 className="font-semibold text-lg mb-2 line-clamp-2">{note.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {note.excerpt}
                    </p>

                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {note.readTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatNumber(note.views)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{formatNumber(note.likes)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{note.comments}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="w-8 h-8 p-0">
                        <Share2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <Button size="sm" className="w-full rounded-full text-xs h-8" asChild>
                      <Link to={`/liner-note-detail/${note.id}`}>
                        <BookOpen className="w-3 h-3 mr-1" />
                        Read More
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredNotes.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No liner notes found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LinerNotes;