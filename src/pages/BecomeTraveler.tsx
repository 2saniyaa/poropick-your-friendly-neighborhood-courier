import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/firebase";
import MatchButton from "@/components/MatchButton";
import { MapPin, Calendar, Package, User } from "lucide-react";

interface Trip {
  id: string;
  user_id: string;
  name: string;
  from: string;
  to: string;
  date: string;
  time: string;
  space: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}


const BecomeTraveler = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to access this page.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      if (session.user) {
        setUser(session.user);
        fetchTrips();
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        if (session.user) {
          setUser(session.user);
          fetchTrips();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Listen for parcel changes to refresh trips list
  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for parcel updates
    const channel = supabase
      .channel('parcel_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcels',
        },
        () => {
          // Refresh trips when parcels are created/updated/deleted
          fetchTrips();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTrips = async () => {
    try {
      // Get all trips
      const { data: tripsData, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (tripsError) {
        console.error("Error fetching trips:", tripsError);
        return;
      }

      // Get all parcels to find booked trips
      const { data: allParcels, error: parcelsError } = await supabase
        .from("parcels")
        .select("trip_id");

      if (parcelsError) {
        console.error("Error fetching parcels:", parcelsError);
        // Continue even if parcels fetch fails
      }

      // Create a set of booked trip IDs
      const bookedTripIds = new Set((allParcels || []).map((p: any) => p.trip_id));

      // Filter out trips that have been booked
      const availableTrips = (tripsData || []).filter((trip: any) => !bookedTripIds.has(trip.id));

      // Fetch profiles for each available trip
      const tripsWithProfiles = await Promise.all(
        availableTrips.map(async (trip) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("user_id", trip.user_id)
            .single();

          return {
            ...trip,
            profiles: profileData || null,
          };
        })
      );

      setTrips(tripsWithProfiles as Trip[]);
    } catch (error) {
      console.error("Error in fetchTrips:", error);
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    // Ensure user is authenticated
    const userId = user?.uid || user?.id;
    if (!user || !userId) {
      toast({
        title: "Authentication required",
        description: "Please log in to post a trip.",
        variant: "destructive",
      });
      setIsLoading(false);
      navigate("/login");
      return;
    }

    const formData = new FormData(e.currentTarget);
    const tripData = {
      user_id: userId,
      email: user?.email || "",
      name: formData.get("name") as string,
      from: formData.get("from") as string,
      to: formData.get("to") as string,
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      space: formData.get("space") as string,
      status: "pending",
    };

    // Remove undefined values to avoid Firestore errors
    const cleanTripData = Object.fromEntries(
      Object.entries(tripData).filter(([_, value]) => value !== undefined && value !== null)
    );

    const { error } = await supabase.from("trips").insert([cleanTripData]);

    if (error) {
      toast({
        title: "Error posting trip",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Trip posted successfully!",
        description: "Your travel is now visible to senders.",
      });
      (e.target as HTMLFormElement).reset();
      fetchTrips();
    }

    setIsLoading(false);
  };


  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Become a Poro-Pal</h1>
            <p className="text-xl text-muted-foreground">
              Post your travel plans and earn money by delivering parcels
            </p>
          </div>

          {/* Post Your Trip Form */}
          <Card className="p-8 mb-12">
            <h2 className="text-2xl font-bold mb-6">Post Your Trip</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Your name"
                  className="mt-2"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="from">From Location</Label>
                  <Input
                    id="from"
                    name="from"
                    placeholder="e.g., Helsinki"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="to">To Location</Label>
                  <Input
                    id="to"
                    name="to"
                    placeholder="e.g., Tampere"
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date">Travel Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    className="mt-2"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="time">Travel Time</Label>
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    className="mt-2"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="space">Available Space</Label>
                <Input
                  id="space"
                  name="space"
                  placeholder="e.g., Small to medium"
                  className="mt-2"
                  required
                />
              </div>

              <Button type="submit" className="w-full btn-hero" disabled={isLoading}>
                {isLoading ? "Posting..." : "Post Trip"}
              </Button>
            </form>
          </Card>

          {/* Posted Trips */}
          <div>
            <h2 className="text-3xl font-bold mb-8">Available Trips</h2>
            <div className="space-y-4">
              {trips.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    No trips posted yet. Be the first to post your travel!
                  </p>
                </Card>
              ) : (
                trips.map((trip) => {
                  return (
                    <Card key={trip.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Traveler Info */}
                        <div className="flex items-center space-x-4">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">
                              {trip.name || trip.profiles?.first_name || "Traveler"}
                            </h3>
                            <p className="text-sm text-muted-foreground">Poro-Pal</p>
                          </div>
                        </div>

                        {/* Route Info */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium">
                              {trip.from || "N/A"} → {trip.to || "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {trip.date ? (() => {
                                  try {
                                    const date = new Date(trip.date);
                                    if (isNaN(date.getTime())) {
                                      return trip.date;
                                    }
                                    return date.toLocaleDateString();
                                  } catch {
                                    return trip.date;
                                  }
                                })() : "Date not set"}
                                {trip.time && ` at ${trip.time}`}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Package className="w-4 h-4" />
                              <span>{trip.space || "Space not specified"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-end gap-3">
                          <MatchButton
                            tripId={trip.id}
                            travelerId={trip.user_id}
                            currentUserId={user.uid || user.id}
                            tripFrom={trip.from}
                            tripTo={trip.to}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BecomeTraveler;
