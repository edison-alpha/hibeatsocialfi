import { Button } from "@/components/ui/button";
import logo from "@/assets/hibeats.png";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-2 backdrop-blur-md bg-transparent">
      <nav className="container mx-auto flex items-center justify-between">
        <div className="flex items-center">
          <img src={logo} alt="hibeats" className="w-17 h-12" />
        </div>
        <Button size="lg" className="font-clash font-semibold">
          Launch App
        </Button>
      </nav>
    </header>
  );
};

export default Header;
