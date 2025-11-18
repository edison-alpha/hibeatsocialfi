import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  Heart,
  MessageCircle,
  Share2,
  ArrowLeft,
  Eye,
  Calendar,
  User
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";

const LinerNoteDetail = () => {
  const { id } = useParams();
  const [isLiked, setIsLiked] = useState(false);

  const linerNotes = [
    {
      id: 1,
      title: "The Making of Cyber Dreams",
      artist: "Synthwave Collective",
      avatar: "SC",
      excerpt: "An intimate look into the creative process behind our latest synthwave masterpiece. From initial concept to final mix, discover the journey that brought Cyber Dreams to life.",
      content: "It all started with a late-night synth session in our Berlin studio. The year was 2024, and we were experimenting with new AI-assisted composition techniques. What began as a simple chord progression evolved into a full-blown cyberpunk anthem that captured the essence of our generation's digital dreams.\n\nThe creative process was both exhilarating and challenging. We spent weeks exploring different sound palettes, from retro analog synthesizers to cutting-edge digital processing. Each member of the collective brought their unique perspective to the table, resulting in a track that feels both cohesive and innovative.\n\nOne of the most interesting aspects of this project was our experimentation with AI tools. We used machine learning algorithms to generate melodic variations and harmonic progressions, then refined these suggestions through our human creativity. This hybrid approach allowed us to explore musical territories we might not have discovered otherwise.\n\nThe mixing process was equally intensive. We focused on creating a soundscape that transports listeners to a neon-lit future, with lush reverb tails and carefully sculpted frequencies. Every element, from the subtlest background texture to the driving bass line, serves the overall narrative of the track.\n\nCyber Dreams represents not just a musical achievement, but a glimpse into the future of music production. It's a testament to the power of combining human creativity with technological innovation.",
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
      content: "The landscape of music production has been forever changed by artificial intelligence. From melody generation to mixing assistance, AI tools are becoming indispensable in the creative process. But what does this mean for human artists? Are we witnessing the dawn of a new creative renaissance, or the beginning of something more profound?\n\nAI music generation tools have evolved rapidly in recent years. What started as simple pattern recognition has blossomed into sophisticated systems capable of creating original compositions in various styles. These tools can analyze vast musical databases and generate new material that follows established patterns while introducing novel elements.\n\nHowever, the role of human artists remains crucial. AI excels at generating ideas and providing inspiration, but it lacks the emotional depth and cultural context that human musicians bring to their work. The most successful implementations of AI in music production involve collaboration between human creativity and machine efficiency.\n\nLooking to the future, we see AI not as a replacement for human musicians, but as a powerful ally. It can handle repetitive tasks, suggest new directions, and help artists explore creative possibilities they might not have considered otherwise. The key is finding the right balance between technological assistance and human expression.\n\nAs we continue to integrate AI into our creative workflows, we're discovering new ways to push the boundaries of what's possible in music. The future of music production is collaborative, innovative, and exciting.",
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
      content: "Five years ago, I was just another musician with a dream and a laptop. Today, I'm touring the world and collaborating with artists I once idolized. This is the story of how persistence, community, and a little bit of luck turned my passion into a career.\n\nIt all began in my small apartment, where I spent countless nights experimenting with jazz samples and electronic beats. I had no formal training, just an insatiable curiosity and a collection of free music production software. What I lacked in technical knowledge, I made up for with raw enthusiasm and determination.\n\nThe turning point came when I started sharing my tracks online. The internet provided a platform to connect with like-minded individuals from around the world. I received feedback, formed collaborations, and gradually built a following. Each small victory – a track getting featured on a popular playlist, a message from a fan in another country – fueled my motivation to continue.\n\nCommunity played a crucial role in my development. Online forums, social media groups, and local music scenes provided support, advice, and opportunities. I learned that success in music isn't just about talent; it's about building relationships and contributing to something larger than yourself.\n\nToday, as I perform on international stages, I often reflect on that humble beginning. The journey from garage to global taught me that with persistence and the right community, any dream is achievable. My story is a testament to the transformative power of music and the incredible opportunities available to those willing to put in the work.",
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
      content: "Sound design is often overlooked in music production, but it's the foundation of truly memorable tracks. Whether you're crafting ambient soundscapes or adding texture to electronic beats, understanding the principles of sound design can elevate your music to new heights.\n\nAt its core, sound design is about creating and manipulating audio elements to evoke emotion and tell a story. It's the difference between a flat, lifeless track and one that transports listeners to another world. Every sound, from the subtlest background texture to the most prominent melody, contributes to the overall narrative.\n\nThe process begins with source material. Field recordings, synthesized sounds, and sampled audio form the building blocks of our sonic palette. The key is not just collecting sounds, but understanding how to transform them. EQ, compression, reverb, and modulation effects become our tools for sculpting these raw materials into something meaningful.\n\nContext is crucial in sound design. A sound that works perfectly in one setting might feel out of place in another. Understanding the emotional impact of different frequencies and timbres allows us to create more intentional and effective soundscapes.\n\nAs technology advances, our sound design tools become more sophisticated. AI-assisted processing, advanced sampling techniques, and immersive audio formats open up new creative possibilities. However, the fundamental principles remain the same: listen carefully, experiment boldly, and always serve the emotional core of your music.\n\nMastering sound design takes time and practice, but the results are worth the effort. When every element of your track works in harmony, you create not just music, but an experience that resonates deeply with listeners.",
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
      content: "The pandemic forced us to adapt, but what emerged was a new way of creating music that transcends geographical boundaries. From cloud-based DAWs to real-time collaboration platforms, discover how technology is bringing musicians closer together than ever before.\n\nRemote collaboration has become the new normal in music production. What was once limited by physical proximity is now possible across continents. Cloud-based digital audio workstations allow multiple producers to work on the same project simultaneously, seeing each other's changes in real-time.\n\nVideo conferencing and screen sharing have become essential tools for creative collaboration. Being able to see and hear each other while working creates a sense of connection that transcends the digital divide. These tools have democratized music production, allowing artists from different backgrounds and locations to collaborate seamlessly.\n\nHowever, remote collaboration presents unique challenges. Technical issues, time zone differences, and the lack of in-person chemistry can complicate the creative process. Successful remote collaboration requires clear communication, established workflows, and a willingness to adapt.\n\nDespite these challenges, the benefits often outweigh the drawbacks. Remote collaboration allows us to work with the best talent available, regardless of location. It fosters diverse creative partnerships and brings fresh perspectives to our work.\n\nAs we look to the future, remote collaboration tools will continue to evolve. Virtual reality studios, AI-assisted mixing, and advanced real-time audio processing promise to make remote collaboration even more seamless and immersive. The digital age has transformed not just how we make music, but who we make it with.",
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
      content: "With so many tools and influences available, finding your unique voice can feel overwhelming. But your authentic sound is what will connect with listeners on a deeper level. Here's how to discover and develop the musical identity that's uniquely yours.\n\nIn an age of infinite musical possibilities, standing out requires authenticity. Your unique sound is the combination of your personal experiences, influences, and creative choices that make your music distinctly yours. It's not about being the most technically proficient, but about expressing something genuine.\n\nThe journey begins with self-reflection. What music moves you? What emotions do you want to evoke in your listeners? What stories do you want to tell? Answering these questions helps clarify your artistic vision and guides your creative decisions.\n\nExperimentation is key to finding your sound. Try different genres, techniques, and tools. Don't be afraid to combine influences in unexpected ways. Your unique sound often emerges from the intersection of different musical traditions and personal experiences.\n\nStudy the masters, but don't imitate. Learn from great artists, but infuse their techniques with your own perspective. Your background, culture, and life experiences are your greatest assets in creating something original.\n\nConsistency matters. As you develop your sound, apply it consistently across your work. This creates a recognizable brand and helps build a loyal audience. However, allow room for evolution – your sound should grow and change as you do.\n\nRemember, your unique sound isn't something you find; it's something you develop through practice, reflection, and persistence. Trust the process, stay true to yourself, and let your authenticity shine through in every note.",
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
      content: "From the pioneering work of Kraftwerk to the AI-assisted compositions of today, electronic music has undergone a remarkable transformation. Join us as we explore the key moments that shaped this genre and speculate on what's coming next.\n\nElectronic music's journey began in the mid-20th century with experimental composers using early synthesizers and tape machines. These pioneers laid the groundwork for what would become a global phenomenon.\n\nThe 1970s and 1980s saw the rise of synth-pop and new wave, with artists like Gary Numan and Depeche Mode bringing electronic music to mainstream audiences. The development of affordable synthesizers democratized electronic music production, allowing more artists to experiment with these new sounds.\n\nThe 1990s brought rave culture and techno, with electronic music becoming a global movement. DJ culture emerged, and electronic music became synonymous with club culture and underground scenes worldwide.\n\nThe 2000s and 2010s saw the integration of digital production tools and the rise of EDM. Festivals like Coachella and Tomorrowland became electronic music's grand stages, bringing the genre to massive audiences.\n\nToday, we're witnessing another transformation with AI and machine learning. These tools are changing how we compose, produce, and even perform electronic music. The future promises even more innovation, with virtual reality concerts and brain-computer interfaces potentially redefining the electronic music experience.\n\nAs we look ahead, electronic music continues to evolve, pushing boundaries and challenging our perceptions of what music can be. The genre that started as experimental sound design has become a global cultural force, and its future is as bright as a synthesizer's LED display.",
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
      content: "A great mix can turn a good track into a masterpiece. Learn the techniques used by professional engineers, from frequency balancing to creative use of effects. These insights will help you achieve professional-sounding results in your own productions.\n\nMixing is both an art and a science. It requires technical knowledge, creative vision, and countless hours of practice. The goal is to create a balanced, cohesive sound where every element serves the song's emotional core.\n\nFrequency balancing is fundamental to good mixing. Understanding which frequencies each instrument occupies helps prevent muddiness and ensures clarity. EQ becomes your primary tool for carving out space for each element in the mix.\n\nDynamics processing – compression and limiting – controls the track's energy and ensures consistent levels. Creative use of compression can add punch and character, while proper limiting prevents clipping and maintains headroom.\n\nReverb and delay create space and depth. These effects can make a dry recording sound lush and professional. The key is using them subtly and purposefully, enhancing rather than overwhelming the mix.\n\nStereo imaging widens the soundstage and creates a sense of space. Panning, stereo effects, and careful use of stereo width can make your mix feel larger than life.\n\nAutomation adds movement and interest. Automating volume, panning, and effects parameters can create dynamic mixes that evolve over time.\n\nRemember, mixing is iterative. Take breaks, listen on different systems, and trust your ears. Professional mixing takes time, but the results are worth every hour invested. With practice and patience, you can achieve mixes that rival the professionals.",
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
      content: "Music is often seen as a solitary pursuit, but the reality is that community plays a crucial role in artistic development and career sustainability. Whether it's online forums, local scenes, or collaborative projects, discover how building connections can enrich your musical journey.\n\nThe music industry can feel isolating, especially for independent artists. Building a supportive community provides emotional sustenance, creative inspiration, and practical opportunities. Your network becomes your net when times get tough.\n\nOnline communities offer global connections. Forums, social media groups, and Discord servers connect you with like-minded individuals worldwide. These digital spaces provide feedback, collaboration opportunities, and a sense of belonging.\n\nLocal scenes ground your music in reality. Attending shows, joining jam sessions, and participating in local events builds relationships that can lead to gigs, collaborations, and lasting friendships.\n\nMentorship is invaluable. Seek out experienced artists willing to share their knowledge. Pay it forward by helping newcomers navigate the industry. This cycle of giving and receiving strengthens the entire community.\n\nCollaborative projects expand your creative horizons. Working with other artists exposes you to new techniques, perspectives, and opportunities. These partnerships often lead to better music and unexpected career opportunities.\n\nCommunity involvement extends beyond music. Engage with your audience through social media, newsletters, and live streams. Building genuine connections with fans creates a loyal following that supports your career long-term.\n\nRemember, community is a two-way street. Contribute as much as you take. Share your knowledge, support others, and participate actively. A strong community not only sustains your career but also makes the journey more enjoyable and meaningful.",
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
      content: "Traditional music distribution models are being challenged by new technologies. Blockchain, NFTs, and decentralized platforms offer artists unprecedented control over their work and direct access to fans. But what does this mean for the future of the music industry?\n\nThe current music industry is built on an outdated model. Streaming services and record labels take the majority of revenue, leaving artists with pennies per stream. Blockchain technology offers a more equitable alternative.\n\nNFTs allow artists to sell digital collectibles, exclusive content, and even fractional ownership of their music. Fans become stakeholders in the artists they support, creating more direct and meaningful relationships.\n\nSmart contracts automate royalty payments, ensuring artists receive fair compensation instantly. No more waiting months for royalty checks or dealing with complex accounting.\n\nDecentralized platforms give artists control over their distribution. Instead of relying on gatekeepers, musicians can distribute directly to fans, retaining more revenue and creative control.\n\nHowever, challenges remain. The technology is still evolving, and regulatory frameworks are catching up. User adoption and education are crucial for widespread acceptance.\n\nDespite these hurdles, the future looks promising. We're moving toward a music industry where artists have more control, fans have more direct access, and the relationship between creators and consumers is more equitable.\n\nThe revolution has begun. As blockchain and NFTs mature, they promise to democratize music distribution and create a more sustainable ecosystem for artists worldwide.",
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
      content: "Every artist faces creative blocks, but learning to overcome them is what separates the amateurs from the professionals. From changing your environment to experimenting with new techniques, discover practical strategies for keeping your creative flow alive.\n\nCreative blocks are inevitable in any artistic pursuit. They can be frustrating and demoralizing, but they're also opportunities for growth. Understanding how to navigate these periods is essential for long-term creative sustainability.\n\nChange your environment. Sometimes a simple change of scenery can spark new ideas. Work in a different room, go for a walk, or visit a new location. Fresh surroundings can stimulate your creativity.\n\nEstablish routines that support creativity. Regular practice, even when inspiration is lacking, builds momentum. Set aside dedicated time for creation, free from distractions and expectations.\n\nExperiment with constraints. Limitations can be liberating. Try working with a limited palette of sounds or a specific theme. Constraints force you to think differently and often lead to more interesting results.\n\nSeek inspiration from other disciplines. Read books, visit museums, watch films. Cross-pollination of ideas from different fields can spark new creative directions.\n\nPractice self-compassion. Creative blocks are normal and temporary. Be kind to yourself during these periods. Sometimes the best thing you can do is rest and recharge.\n\nCollaborate with others. Working with fellow artists can provide fresh perspectives and break through mental barriers. Sometimes, external input is exactly what you need to get unstuck.\n\nRemember, creative blocks are part of the process. They teach patience, resilience, and the value of persistence. Each time you work through a block, you emerge stronger and more capable. Keep creating, keep experimenting, and trust that inspiration will return.",
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
      content: "Live performance is a different beast entirely from studio production. Learn how to adapt your tracks for live settings, engage audiences, and create memorable experiences. Whether you're playing intimate venues or large festivals, these techniques will help you shine.\n\nThe transition from studio to stage requires a different mindset. What works in headphones might not translate to a live environment. Understanding the unique challenges and opportunities of live performance is crucial for success.\n\nTechnical preparation is essential. Ensure your equipment is reliable and your set is well-rehearsed. Have backup plans for technical issues and know your songs inside out.\n\nAudience engagement transforms a performance from a show to an experience. Make eye contact, interact with the crowd, and create moments of connection. Your energy on stage directly influences the audience's experience.\n\nAdapt your music for live settings. Consider the acoustics of the venue, the mood of the crowd, and the flow of your set. Sometimes, slight modifications to your tracks can make them more effective live.\n\nBuild a narrative arc for your performance. Think of your set as a story with a beginning, middle, and end. Create tension, release, and emotional peaks that keep the audience engaged throughout.\n\nContinuous improvement comes from experience and feedback. Record your performances, seek constructive criticism, and always look for ways to improve. Each show is an opportunity to grow as a performer.\n\nLive performance is where the magic happens. It's where your music comes alive and connects with people in real-time. Master these skills, and you'll create unforgettable experiences for both yourself and your audience.",
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

  const note = linerNotes.find(n => n.id === parseInt(id || "0"));

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (!note) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-16">
          <div className="container mx-auto px-6 py-12">
            <div className="text-center">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h1 className="font-clash font-semibold text-2xl mb-2">Note Not Found</h1>
              <p className="text-muted-foreground mb-6">The liner note you're looking for doesn't exist.</p>
              <Button asChild>
                <Link to="/liner-notes">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Liner Notes
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6 max-w-4xl">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="gap-2">
              <Link to="/liner-notes">
                <ArrowLeft className="w-4 h-4" />
                Back to Liner Notes
              </Link>
            </Button>
          </div>

          {/* Article Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {note.avatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{note.artist}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {note.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {note.readTime}
                  </span>
                </div>
              </div>
            </div>

            <h1 className="font-clash font-semibold text-3xl lg:text-4xl mb-4 leading-tight">
              {note.title}
            </h1>

            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {note.excerpt}
            </p>

            {/* Article Meta */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-6">
              <span className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                {formatNumber(note.views)} views
              </span>
              <span className="flex items-center gap-2">
                <Heart className="w-4 h-4" />
                {formatNumber(note.likes)} likes
              </span>
              <span className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {note.comments} comments
              </span>
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                {note.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {note.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Article Content */}
          <Card className="border-border/20 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-8">
              <div className="prose prose-lg max-w-none text-foreground">
                {note.content.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-6 leading-relaxed text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Article Footer */}
          <div className="mt-8 pt-8 border-t border-border/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant={isLiked ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsLiked(!isLiked)}
                  className="gap-2"
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  {formatNumber(isLiked ? note.likes + 1 : note.likes)}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  {note.comments}
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>

              <Button variant="outline" asChild>
                <Link to="/liner-notes">
                  <BookOpen className="w-4 h-4 mr-2" />
                  More Stories
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LinerNoteDetail;