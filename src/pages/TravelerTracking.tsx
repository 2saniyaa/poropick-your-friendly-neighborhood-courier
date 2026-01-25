import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Calendar, User, Phone, Navigation as NavIcon } from "lucide-react";
import {
  updateParcelStatus,
  formatParcelStatus,
  getStatusColor,
  getStatusIcon,
  formatLocationSimple,
  getGoogleMapsUrl,
  PARCEL_STATUS,
  type ParcelStatus,
} from "@/lib/trackingHelpers";

interface Parcel {
  id: string;
  trip_id: string;
  sender_id: string;
  sender_email: string;
  sender_name: string;
  sender_phone: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string | null;
  parcel_description: string;
  parcel_size: string;
  special_instructions: string | null;
  pickup_point: string;
  status: ParcelStatus;
  location: { lat: number; lng: number; accuracy: number } | null;
  tracking_id: string;
  created_at: string;
  updated_at: string | null;
  trip?: {
    from: string;
    to: string;
    date: string;
    time: string;
  };
}

const TravelerTracking = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to view your parcels.",
          variant: "destructive",
        });
        navigate("/login");
        return;
      }
      setUser(session.user);
      fetchMyParcels(session.user.email || "");
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login");
      } else {
        setUser(session.user);
        fetchMyParcels(session.user?.email || "");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const fetchMyParcels = async (userEmail: string) => {
    if (!userEmail) return;

    setIsLoading(true);
    try {
      // Get all trips by this user
      const { data: myTrips, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .eq("email", userEmail);

      if (tripsError) throw tripsError;

      if (!myTrips || myTrips.length === 0) {
        setParcels([]);
        setIsLoading(false);
        return;
      }

      const tripIds = myTrips.map((trip: any) => trip.id);

      if (tripIds.length === 0) {
        setParcels([]);
        setIsLoading(false);
        return;
      }

      // Get all parcels for these trips
      // Note: Firestore 'in' operator supports up to 10 values
      // For more trips, we'll need to batch queries
      let parcelsData: any[] = [];
      let parcelsError: any = null;

      if (tripIds.length <= 10) {
        const result = await supabase
          .from("parcels")
          .select("*")
          .in("trip_id", tripIds);
        parcelsData = result.data || [];
        parcelsError = result.error;
      } else {
        // Batch queries for more than 10 trips
        const batches = [];
        for (let i = 0; i < tripIds.length; i += 10) {
          batches.push(tripIds.slice(i, i + 10));
        }
        
        const results = await Promise.all(
          batches.map(batch => supabase.from("parcels").select("*").in("trip_id", batch))
        );
        
        parcelsData = results.flatMap(r => r.data || []);
        parcelsError = results.find(r => r.error)?.error;
      }

      if (parcelsError) throw parcelsError;

      // Sort by created_at descending
      parcelsData.sort((a, b) => {
        const aDate = new Date(a.created_at).getTime();
        const bDate = new Date(b.created_at).getTime();
        return bDate - aDate;
      });

      if (parcelsError) throw parcelsError;

      // Enrich parcels with trip data
      const enrichedParcels = (parcelsData || []).map((parcel: any) => {
        const trip = myTrips.find((t: any) => t.id === parcel.trip_id);
        return {
          ...parcel,
          trip: trip ? {
            from: trip.from,
            to: trip.to,
            date: trip.date,
            time: trip.time,
          } : undefined,
        };
      });

      setParcels(enrichedParcels);
    } catch (error: any) {
      toast({
        title: "Error fetching parcels",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (parcelId: string, newStatus: ParcelStatus) => {
    try {
      const result = await updateParcelStatus(supabase, parcelId, newStatus, true);

      if (result.success) {
        toast({
          title: "Status updated",
          description: `Parcel status updated to ${formatParcelStatus(newStatus)}`,
        });
        // Refresh parcels
        if (user?.email) {
          fetchMyParcels(user.email);
        }
      } else {
        throw result.error || new Error("Failed to update status");
      }
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canUpdateStatus = (currentStatus: ParcelStatus, newStatus: ParcelStatus): boolean => {
    // Status progression: null → picked_up → in_transit → delivered
    if (currentStatus === null && newStatus === PARCEL_STATUS.PICKED_UP) return true;
    if (currentStatus === PARCEL_STATUS.PICKED_UP && newStatus === PARCEL_STATUS.IN_TRANSIT) return true;
    if (currentStatus === PARCEL_STATUS.IN_TRANSIT && newStatus === PARCEL_STATUS.DELIVERED) return true;
    return false;
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
            <h1 className="text-5xl font-bold mb-4">My Parcels</h1>
            <p className="text-xl text-muted-foreground">
              Manage and track parcels for your trips
            </p>
          </div>

          {isLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading parcels...</p>
            </Card>
          ) : parcels.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No parcels assigned to your trips yet.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {parcels.map((parcel) => (
                <Card key={parcel.id} className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Parcel Info */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-xl font-semibold mb-2">
                            Parcel to {parcel.recipient_name}
                          </h3>
                          <Badge
                            style={{
                              backgroundColor: getStatusColor(parcel.status),
                              color: 'white',
                            }}
                            className="mb-2"
                          >
                            {getStatusIcon(parcel.status)} {formatParcelStatus(parcel.status)}
                          </Badge>
                        </div>
                      </div>

                      {parcel.trip && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {parcel.trip.from} → {parcel.trip.to}
                          </span>
                          <Calendar className="w-4 h-4 ml-4" />
                          <span>
                            {parcel.trip.date} {parcel.trip.time && `at ${parcel.trip.time}`}
                          </span>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold mb-1">Sender</p>
                          <div className="space-y-1 text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {parcel.sender_name}
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {parcel.sender_phone}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">Recipient</p>
                          <div className="space-y-1 text-muted-foreground">
                            <p className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {parcel.recipient_name}
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {parcel.recipient_phone}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="font-semibold">Parcel:</span> {parcel.parcel_description}
                        </p>
                        <p>
                          <span className="font-semibold">Size:</span> {parcel.parcel_size}
                        </p>
                        <p>
                          <span className="font-semibold">Pickup Point:</span> {parcel.pickup_point}
                        </p>
                        {parcel.special_instructions && (
                          <p>
                            <span className="font-semibold">Special Instructions:</span> {parcel.special_instructions}
                          </p>
                        )}
                      </div>

                      {parcel.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <NavIcon className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">
                            Last location: {formatLocationSimple(parcel.location)}
                          </span>
                          {getGoogleMapsUrl(parcel.location) && (
                            <a
                              href={getGoogleMapsUrl(parcel.location)!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View on Map
                            </a>
                          )}
                        </div>
                      )}

                      {parcel.updated_at && (
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(parcel.updated_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Status Update Buttons */}
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      {canUpdateStatus(parcel.status, PARCEL_STATUS.PICKED_UP) && (
                        <Button
                          onClick={() => handleStatusUpdate(parcel.id, PARCEL_STATUS.PICKED_UP)}
                          className="w-full"
                          variant="outline"
                        >
                          📦 Picked Up
                        </Button>
                      )}
                      {canUpdateStatus(parcel.status, PARCEL_STATUS.IN_TRANSIT) && (
                        <Button
                          onClick={() => handleStatusUpdate(parcel.id, PARCEL_STATUS.IN_TRANSIT)}
                          className="w-full"
                          variant="outline"
                        >
                          🚚 In Transit
                        </Button>
                      )}
                      {canUpdateStatus(parcel.status, PARCEL_STATUS.DELIVERED) && (
                        <Button
                          onClick={() => handleStatusUpdate(parcel.id, PARCEL_STATUS.DELIVERED)}
                          className="w-full"
                          variant="outline"
                        >
                          ✅ Delivered
                        </Button>
                      )}
                      {parcel.status === PARCEL_STATUS.DELIVERED && (
                        <p className="text-sm text-muted-foreground text-center mt-2">
                          Parcel delivered
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TravelerTracking;

