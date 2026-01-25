import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-muted border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl font-bold text-foreground">Poropick</span>
            </div>
            <p className="text-muted-foreground text-sm mb-2">
              Smart, fast & friendly parcel delivery powered by people.
            </p>
            <p className="text-primary font-medium text-sm">
              poropickvaasa@gmail.com
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/send-parcel" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Send Parcel
                </Link>
              </li>
              <li>
                <Link to="/become-traveler" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Become a Traveler
                </Link>
              </li>

            </ul>
          </div>


        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
        </div>
      </div>
    </footer>
  );
};

export default Footer;
