import { Link } from "react-router-dom";
import logo from "@/assets/poropick-logo.png";

/** Lightweight header shown until full Navigation (with Firebase/auth) loads. */
export default function MinimalHeader() {
  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <img src={logo} alt="Poropick" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/track" className="text-foreground hover:text-primary transition-colors">
              Track
            </Link>
            <Link to="/become-traveler" className="text-foreground hover:text-primary transition-colors">
              Become a Poro-Pal
            </Link>
            <Link to="/send-parcel" className="text-foreground hover:text-primary transition-colors">
              Send Parcel
            </Link>
            <Link to="/login" className="text-foreground hover:text-primary transition-colors">
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
