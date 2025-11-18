import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-bg.jpg";
import somniaLogo from "@/assets/somnia.png";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-glow"></div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-32 relative z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="font-clash font-semibold text-5xl md:text-7xl lg:text-8xl leading-tight">
            Create your own song with AI
            <br />
            <span className="inline-block mt-2">
              and <AnimatedRotatingWord /> your song
            </span>
          </h1>
          
          <p className="text-sm text-muted-foreground tracking-wider flex items-center justify-center gap-2">
            Powered by
            <img src={somniaLogo} alt="Somnia" className="inline-block h-6 object-contain" />
          </p>

          <div className="flex flex-col items-center gap-6 pt-4">
            <Link to="/feed">
              <Button 
                variant="outline" 
                size="lg" 
                className="font-clash font-semibold text-lg px-12 py-4 h-auto rounded-full border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                Launch App
              </Button>
            </Link>

            <button 
              className="text-foreground/60 hover:text-foreground transition-colors animate-bounce"
              aria-label="Scroll down"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
    </section>
  );
};

export default Hero;

// Small inline component to rotate a few words with a fade effect
function AnimatedRotatingWord() {
  const words = ["Create", "Trade", "Share", "Earn"];
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // fade out
      setVisible(false);
      // after fade out, switch word and fade in
      const t = setTimeout(() => {
        setIndex((i) => (i + 1) % words.length);
        setVisible(true);
      }, 300);

      return () => clearTimeout(t);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className={
        "inline-block text-primary drop-shadow-[0_0_30px_rgba(179,255,94,0.5)] transition-opacity duration-300 " +
        (visible ? "opacity-100" : "opacity-0")
      }
      aria-live="polite"
    >
      {words[index]}
    </span>
  );
}
