import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Package, Users, Shield, TrendingUp, Heart, Leaf, Search, MapPin } from "lucide-react";
import Button from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-delivery.png";
import { supabase } from "@/integrations/firebase";

const DELIVERY_POPUP_DURATION_MS = 10 * 60 * 1000; // 10 minutes
const RECENT_NOTIFICATION_WINDOW_MS = 10 * 60 * 1000; // show popup for notifications from last 10 mins

const Index = () => {
  const navigate = useNavigate();
  const [deliveryPopup, setDeliveryPopup] = useState<{
    open: boolean;
    trip_from: string;
    trip_to: string;
    sender_name: string;
  } | null>(null);
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedAtRef = useRef<number>(0);
  const shownNotificationIdsRef = useRef<Set<string>>(new Set());

  const showPopupForNotification = (n: { id?: string; trip_from?: string; trip_to?: string; sender_name?: string }) => {
    const id = n.id ?? "";
    if (id && shownNotificationIdsRef.current.has(id)) return;
    if (id) shownNotificationIdsRef.current.add(id);
    setDeliveryPopup({
      open: true,
      trip_from: n.trip_from ?? "",
      trip_to: n.trip_to ?? "",
      sender_name: n.sender_name ?? "A sender",
    });
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.uid ?? (session?.user as { id?: string })?.id;
      if (!uid) return;

      mountedAtRef.current = Date.now();

      // On load: show popup if there's a recent "trip_matched" notification (e.g. user just signed back in)
      try {
        const { data: list } = await supabase
          .from("notifications")
          .select("*")
          .eq("recipient_user_id", uid);
        const recent = (list || [])
          .filter((n: any) => n.type === "trip_matched")
          .filter((n: any) => {
            const created = n.created_at ? new Date(n.created_at).getTime() : 0;
            return Date.now() - created <= RECENT_NOTIFICATION_WINDOW_MS;
          })
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (recent.length > 0) {
          showPopupForNotification(recent[0]);
        }
      } catch {
        // ignore
      }

      channel = supabase.channel(`home-delivery-popup-${uid}`);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          table: "notifications",
          filter: `recipient_user_id=eq.${uid}`,
        },
        (payload: { new?: { id?: string; type?: string; trip_from?: string; trip_to?: string; sender_name?: string } }) => {
          const data = payload?.new;
          if (!data || data.type !== "trip_matched") return;
          if (Date.now() - mountedAtRef.current < 2500) return;

          showPopupForNotification(data);
        }
      );
      (channel as { subscribe?: () => void }).subscribe?.();
    };

    setup();
    return () => {
      if (popupTimerRef.current) clearTimeout(popupTimerRef.current);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!deliveryPopup?.open) return;
    popupTimerRef.current = setTimeout(() => {
      setDeliveryPopup((prev) => (prev ? { ...prev, open: false } : null));
      popupTimerRef.current = null;
    }, DELIVERY_POPUP_DURATION_MS);
    return () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
        popupTimerRef.current = null;
      }
    };
  }, [deliveryPopup?.open]);

  const closePopup = () => {
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
    setDeliveryPopup((prev) => (prev ? { ...prev, open: false } : null));
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* New delivery assigned popup - shown on Home for 10 minutes */}
      {deliveryPopup && (
        <Dialog open={deliveryPopup.open} onOpenChange={(open) => !open && closePopup()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New delivery assigned</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{deliveryPopup.sender_name}</span> matched with your
                trip{" "}
                <span className="font-semibold">
                  {deliveryPopup.trip_from || "—"} → {deliveryPopup.trip_to || "—"}
                </span>
                . Check My Parcels to manage it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button onClick={() => { closePopup(); navigate("/traveler-tracking"); }}>
                View my parcels
              </Button>
              <Button variant="outline" onClick={closePopup}>
                Dismiss
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
                Upload a photo and describe what you need delivered. Set your delivery timeline.
              </p>
            </Card>

            <Card className="p-8 text-center card-hover">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Choose your traveler</h3>
              <p className="text-muted-foreground">
                Review offers from verified travelers going to the same destination as you.
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
              <h3 className="text-xl font-semibold mb-3">Post your travels and find orders to deliver</h3>
              <p className="text-muted-foreground">
                Post and search for orders based on where you're traveling.
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