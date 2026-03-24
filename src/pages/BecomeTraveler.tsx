import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/firebase";
import MatchButton from "@/components/MatchButton";
import { MapPin, Calendar, Package, User, Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadProfilePhoto, saveProfilePhotoUrl } from "@/integrations/firebase/storage";
import { uploadAsBase64, saveProfilePhotoUrl as savePhotoUrl } from "@/integrations/firebase/storage-free";

interface Trip {
  id: string;
  user_id: string;
  name: string;
  from: string;
  to: string;
  date: string;
  time: string;
  space: string;
  capacity_kg?: number | null;
  traveler_photo_url?: string | null;
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
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to access this page.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
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
        navigate("/login", { replace: true });
      } else {
        if (session.user) {
        setUser(session.user);
        fetchTrips();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Fetch current user's profile photo
  useEffect(() => {
    if (!user) return;
    const uid = user.uid || user.id;
    const loadProfile = async () => {
      try {
        // Use direct Firestore document lookup (profile doc ID = user_id)
        const { getProfilePhoto } = await import("@/integrations/firebase/storage-free");
        const photo = await getProfilePhoto(uid);
        if (photo) {
          setProfilePhotoUrl(photo);
        }
      } catch (err) {
        console.warn("Could not load profile photo:", err);
      }
    };
    loadProfile();
  }, [user]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      if (!file) {
        toast({ title: "No file selected", description: "Please choose an image file.", variant: "destructive" });
      }
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }
    const uid = user.uid || (user as any).id;
    if (!uid) {
      toast({ title: "Authentication error", description: "User ID not found. Please log in again.", variant: "destructive" });
      return;
    }
    
    // Check file size (max 2MB for base64 storage, 5MB for Firebase Storage)
    const maxSize = 2 * 1024 * 1024; // 2MB for base64 (Firestore limit)
    if (file.size > maxSize) {
      toast({ 
        title: "File too large", 
        description: "Please choose an image smaller than 2MB. It will be compressed automatically.", 
        variant: "destructive" 
      });
      return;
    }

    setPhotoUploading(true);
    e.target.value = "";
    try {
      console.log("Starting photo upload (base64 - FREE) for user:", uid);
      // Use FREE base64 storage (no CORS needed, no external service)
      const base64DataUrl = await uploadAsBase64(uid, file);
      console.log("Upload successful (base64)");
      setProfilePhotoUrl(base64DataUrl); // base64 data URL can be used directly in <img src>
      toast({ 
        title: "Photo updated", 
        description: "Your profile photo is now visible to senders after they book your trip. (Stored for free in Firestore)" 
      });
    } catch (err: any) {
      console.error("Photo upload error:", err);
      const errorMessage = err?.message || err?.code || "Could not upload photo. Please try a smaller image.";
      toast({ 
        title: "Upload failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setPhotoUploading(false);
    }
  };

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

      // Fetch profiles and photos for each available trip
    const tripsWithProfiles = await Promise.all(
        availableTrips.map(async (trip) => {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("user_id", trip.user_id)
          .single();

        // Fetch traveler photo
        let traveler_photo_url: string | null = null;
        try {
          const { getProfilePhoto } = await import("@/integrations/firebase/storage-free");
          traveler_photo_url = await getProfilePhoto(trip.user_id);
        } catch (err) {
          console.warn("Could not fetch photo for trip:", trip.id, err);
        }

        return {
          ...trip,
          profiles: profileData || null,
          traveler_photo_url,
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
      navigate("/login", { replace: true });
      return;
    }

    const formData = new FormData(e.currentTarget);
    const capacityKg = formData.get("capacity_kg");
    const tripData = {
      user_id: userId,
      email: user?.email || "",
      name: formData.get("name") as string,
      from: formData.get("from") as string,
      to: formData.get("to") as string,
      date: formData.get("date") as string,
      time: formData.get("time") as string,
      space: formData.get("space") as string,
      capacity_kg: capacityKg ? Number(capacityKg) : null,
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
    <Layout>
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Become a Poro-Pal</h1>
            <p className="text-xl text-muted-foreground">
              Post your travel plans and earn money by delivering parcels
            </p>
          </div>

          {/* Profile photo (shown to senders after they book your trip) */}
          <Card className="p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">Your profile photo</h2>
            <p className="text-muted-foreground mb-6">
              Senders and recipients will see this after they book your trip so they can recognize you.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profilePhotoUrl ?? undefined} alt="Profile" />
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  <User className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={photoUploading}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {photoUploading ? "Uploading..." : profilePhotoUrl ? "Change photo" : "Upload photo"}
                </Button>
              </div>
            </div>
          </Card>

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

              <div>
                <Label htmlFor="capacity_kg">Capacity (kg)</Label>
                <Input
                  id="capacity_kg"
                  name="capacity_kg"
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g., 10"
                  className="mt-2"
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
                          <Avatar className="h-16 w-16 border-2 border-primary/20 flex-shrink-0">
                            <AvatarImage src={trip.traveler_photo_url ?? undefined} alt={trip.name || "Traveler"} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              <User className="w-8 h-8" />
                            </AvatarFallback>
                          </Avatar>
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
                            {trip.capacity_kg != null && (
                              <div className="flex items-center space-x-1">
                                <span className="font-medium">Capacity:</span>
                                <span>{trip.capacity_kg} kg</span>
                              </div>
                            )}
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
    </Layout>
  );
};

export default BecomeTraveler;
