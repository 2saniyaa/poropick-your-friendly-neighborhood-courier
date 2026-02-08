import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Calendar, User, Phone, Navigation as NavIcon, Copy, ExternalLink } from "lucide-react";
import {
  formatParcelStatus,
  getStatusColor,
  getStatusIcon,
  formatLocationSimple,
  getGoogleMapsUrl,
  getParcelTrackingUrl,
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
    name: string;
    email: string;
    from: string;
    to: string;
    date: string;
    time: string;
  };
}

const SenderTracking = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedParcel, setExpandedParcel] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to track your parcels.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
        return;
      }
      setUser(session.user);
      fetchMyParcels(session.user.uid || session.user.id);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/login", { replace: true });
      } else {
        setUser(session.user);
        fetchMyParcels(session.user?.uid || session.user?.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  useEffect(() => {
    if (!user) return;

    const userId = user.uid || user.id;

    // Set up real-time subscription for parcel updates using Firestore
    const channel = supabase
      .channel('parcel_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcels',
        },
        (payload: any) => {
          if (payload.new?.sender_id === userId || payload.old?.sender_id === userId) {
            fetchMyParcels(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchMyParcels = async (userId: string) => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Get all parcels sent by this user
      // Note: We fetch without orderBy to avoid needing a composite index
      // We'll sort in memory instead
      const { data: parcelsData, error: parcelsError } = await supabase
        .from("parcels")
        .select("*")
        .eq("sender_id", userId);

      if (parcelsError) throw parcelsError;

      // Sort by created_at descending in memory
      const sortedParcels = (parcelsData || []).sort((a: any, b: any) => {
        const aDate = new Date(a.created_at || 0).getTime();
        const bDate = new Date(b.created_at || 0).getTime();
        return bDate - aDate;
      });

      // Get trip information for each parcel
      const enrichedParcels = await Promise.all(
        sortedParcels.map(async (parcel: any) => {
          const { data: tripData } = await supabase
            .from("trips")
            .select("name, email, from, to, date, time")
            .eq("id", parcel.trip_id)
            .single();

          return {
            ...parcel,
            trip: tripData || undefined,
          };
        })
      );

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

  const copyTrackingUrl = (trackingId: string) => {
    const url = getParcelTrackingUrl(trackingId);
    navigator.clipboard.writeText(url);
    toast({
      title: "Tracking URL copied",
      description: "Share this link to track your parcel",
    });
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
            <h1 className="text-5xl font-bold mb-4">Track Your Parcels</h1>
            <p className="text-xl text-muted-foreground">
              Monitor the status of your sent parcels in real-time
            </p>
          </div>

          {isLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading parcels...</p>
            </Card>
          ) : parcels.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                You haven't sent any parcels yet.
              </p>
              <Button onClick={() => navigate("/send-parcel")} className="btn-hero">
                Send a Parcel
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {parcels.map((parcel) => (
                <Card key={parcel.id} className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">
                          Parcel to {parcel.recipient_name}
                        </h3>
                        <Badge
                          style={{
                            backgroundColor: getStatusColor(parcel.status),
                            color: 'white',
                          }}
                        >
                          {getStatusIcon(parcel.status)} {formatParcelStatus(parcel.status)}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyTrackingUrl(parcel.tracking_id)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Tracking URL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedParcel(
                            expandedParcel === parcel.id ? null : parcel.id
                          )}
                        >
                          {expandedParcel === parcel.id ? 'Hide' : 'Show'} Details
                        </Button>
                      </div>
                    </div>

                    {/* Basic Info */}
                    {parcel.trip && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{parcel.trip.from} → {parcel.trip.to}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {parcel.trip.date} {parcel.trip.time && `at ${parcel.trip.time}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>Traveler: {parcel.trip.name}</span>
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {expandedParcel === parcel.id && (
                      <div className="pt-4 border-t space-y-4">
                        {/* Parcel Information */}
                        <div>
                          <h4 className="font-semibold mb-2">Parcel Information</h4>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p><span className="font-medium">Description:</span> {parcel.parcel_description}</p>
                            <p><span className="font-medium">Size:</span> {parcel.parcel_size}</p>
                            <p><span className="font-medium">Pickup Point:</span> {parcel.pickup_point}</p>
                            {parcel.special_instructions && (
                              <p><span className="font-medium">Special Instructions:</span> {parcel.special_instructions}</p>
                            )}
                          </div>
                        </div>

                        {/* Delivery Details */}
                        <div>
                          <h4 className="font-semibold mb-2">Delivery Details</h4>
                          <div className="grid md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-medium mb-1">Recipient</p>
                              <div className="space-y-1 text-muted-foreground">
                                <p className="flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  {parcel.recipient_name}
                                </p>
                                <p className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {parcel.recipient_phone}
                                </p>
                                {parcel.recipient_address && (
                                  <p className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    {parcel.recipient_address}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium mb-1">Sender</p>
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
                          </div>
                        </div>

                        {/* Location & Tracking */}
                        {parcel.location && (
                          <div>
                            <h4 className="font-semibold mb-2">Last Known Location</h4>
                            <div className="flex items-center gap-2 text-sm">
                              <NavIcon className="w-4 h-4 text-primary" />
                              <span className="text-muted-foreground">
                                {formatLocationSimple(parcel.location)}
                              </span>
                              {getGoogleMapsUrl(parcel.location) && (
                                <a
                                  href={getGoogleMapsUrl(parcel.location)!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  View on Map
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Tracking Info */}
                        <div>
                          <h4 className="font-semibold mb-2">Tracking</h4>
                          <div className="space-y-2 text-sm">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Tracking ID:</span> {parcel.tracking_id}
                            </p>
                            {parcel.updated_at && (
                              <p className="text-muted-foreground">
                                <span className="font-medium">Last Updated:</span> {new Date(parcel.updated_at).toLocaleString()}
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              <span className="font-medium">Created:</span> {new Date(parcel.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
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

export default SenderTracking;

