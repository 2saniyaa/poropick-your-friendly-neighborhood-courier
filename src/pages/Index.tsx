import { Link } from "react-router-dom";
import { ArrowRight, Package, Users, Shield, TrendingUp, Heart, Leaf, Search, MapPin } from "lucide-react";
import Button from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-delivery.png";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                Every Journey Can Carry More!
              </h1>
              <p className="text-xl text-muted-foreground">
                Make your travel smarter and sustainable by using extra space to deliver a parcel. Earn money on trips you're already taking.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/send-parcel">
                  <Button size="lg" className="btn-hero w-full sm:w-auto">
                    Send a Parcel
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/become-traveler">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Become a Traveler
                  </Button>
                </Link>
                <Link to="/track">
                </Link>
              </div>
              <p className="text-sm text-muted-foreground">
                Receiving a parcel? <Link to="/track" className="text-primary hover:underline font-medium">Track it here</Link> - No account needed!
              </p>
            </div>
            <div className="relative animate-scale-in">
              <img
                src={heroImage}
                alt="Friendly traveler delivering parcel"
                className="rounded-3xl shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - For Users */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Earn money on trips you're already taking. Our travelers usually deliver a few items and earn per trip.
            </p>
          </div>
          
          <h3 className="text-2xl font-semibold text-center mb-12 text-primary">For Users</h3>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-center card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Post your item</h3>
              <p className="text-muted-foreground">
                Upload a photo and describe what you need delivered. Set your budget and delivery timeline.
              </p>
            </Card>

            <Card className="p-8 text-center card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Choose your traveler</h3>
              <p className="text-muted-foreground">
                Review offers from verified travelers. Check their ratings and delivery history.
              </p>
            </Card>

            <Card className="p-8 text-center card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Track and receive</h3>
              <p className="text-muted-foreground">
                Follow your item in real-time. Meet your traveler and get your delivery safely.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works - For Travelers */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-4">
          <h3 className="text-2xl font-semibold text-center mb-12 text-accent">For Travelers</h3>
          <p className="text-center text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            Earn money on trips you're already taking. Our travelers usually deliver a few items and earn per trip.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 text-center card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <Package className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Find orders to deliver</h3>
              <p className="text-muted-foreground">
                Search for orders based on where you're traveling.
              </p>
            </Card>

            <Card className="p-8 text-center card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Confirm with sender</h3>
              <p className="text-muted-foreground">
                Connect with the sender, confirm details, and arrange pickup location and time.
              </p>
            </Card>

            <Card className="p-8 text-center card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Deliver and earn</h3>
              <p className="text-muted-foreground">
                Pick up the item, travel safely, and deliver to the recipient. Get paid instantly.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Poropick?</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 card-hover">
              <TrendingUp className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Faster Delivery</h3>
              <p className="text-sm text-muted-foreground">
                Skip traditional shipping. Get your items delivered on your timeline.
              </p>
            </Card>

            <Card className="p-6 card-hover">
              <Heart className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Affordable</h3>
              <p className="text-sm text-muted-foreground">
                Save up to 50% compared to traditional courier services.
              </p>
            </Card>

            <Card className="p-6 card-hover">
              <Leaf className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Eco-Friendly</h3>
              <p className="text-sm text-muted-foreground">
                Uses existing travel routes, reducing carbon footprint.
              </p>
            </Card>

            <Card className="p-6 card-hover">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">Verified Users</h3>
              <p className="text-sm text-muted-foreground">
                All travelers are verified with ID and ratings system.
              </p>
            </Card>
          </div>
        </div>
      </section>


      <Footer />
    </div>
  );
};

export default Index;