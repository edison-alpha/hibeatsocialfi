import somniaLogo from "@/assets/somnia.png";

const Partners = () => {
  // Create multiple copies for seamless infinite scroll effect
  const logos = Array(20).fill(somniaLogo);

  return (
    <section className="py-12 border-y border-border/30 bg-muted/20 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="relative">
          {/* Duplicate the logos for seamless scrolling */}
          <div className="flex items-center gap-12 animate-scroll-infinite">
            {logos.concat(logos).map((logo, index) => (
              <img
                key={index}
                src={logo}
                alt="Somnia"
                className="h-8 w-auto object-contain flex-shrink-0 filter brightness-0 invert"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Partners;
