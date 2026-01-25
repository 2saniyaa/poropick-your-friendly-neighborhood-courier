import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Calendar, User, Phone, Navigation as NavIcon, ExternalLink, Search, Copy } from "lucide-react";
import {
  formatParcelStatus,
  getStatusColor,
  getStatusIcon,
  formatLocationSimple,
  getGoogleMapsUrl,
  type ParcelStatus,
} from "@/lib/trackingHelpers";

interface Parcel {
  id: string;
  trip_id: string;
  sender_name: string;
  recipient_name: string;
  recipient_phone: string;
  parcel_description: string;
  parcel_size: string;
  pickup_point: string;
  status: ParcelStatus;
  location: { lat: number; lng: number; accuracy: number } | null;
  tracking_id: string;
  created_at: string;
  updated_at: string | null;
  trip?: {
    name: string;
    from: string;
    to: string;
    date: string;
    time: string;
  };
}

const PublicTracking = () => {
  const { trackingId } = useParams<{ trackingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [showSearch, setShowSearch] = useState(!trackingId);

  useEffect(() => {
    if (trackingId) {
      fetchParcelByTrackingId(trackingId);
    }
  }, [trackingId]);

  // Set up real-time listener for parcel updates
  useEffect(() => {
    if (!parcel?.id) return;

    const channel = supabase
      .channel('public_parcel_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parcels',
        },
        (payload: any) => {
          if (payload.new?.tracking_id === parcel.tracking_id || payload.old?.tracking_id === parcel.tracking_id) {
            fetchParcelByTrackingId(parcel.tracking_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [parcel?.id, parcel?.tracking_id]);

  const fetchParcelByTrackingId = async (code: string) => {
    if (!code) return;

    setIsLoading(true);
    try {
      // Query parcels by tracking_id
      const { data: parcelsData, error } = await supabase
        .from("parcels")
        .select("*")
        .eq("tracking_id", code.toUpperCase());

      if (error) throw error;

      if (!parcelsData || parcelsData.length === 0) {
        toast({
          title: "Parcel not found",
          description: "No parcel found with this tracking code. Please check the code and try again.",
          variant: "destructive",
        });
        setParcel(null);
        setIsLoading(false);
        return;
      }

      const parcelData = parcelsData[0];

      // Get trip information
      const { data: tripData } = await supabase
        .from("trips")
        .select("name, email, from, to, date, time")
        .eq("id", parcelData.trip_id)
        .single();

      setParcel({
        ...parcelData,
        trip: tripData || undefined,
      });
    } catch (error: any) {
      toast({
        title: "Error fetching parcel",
        description: error.message,
        variant: "destructive",
      });
      setParcel(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchCode.trim()) {
      toast({
        title: "Tracking code required",
        description: "Please enter a tracking code",
        variant: "destructive",
      });
      return;
    }

    navigate(`/track/${searchCode.toUpperCase()}`);
  };

  const copyTrackingCode = () => {
    if (parcel?.tracking_id) {
      navigator.clipboard.writeText(parcel.tracking_id);
      toast({
        title: "Tracking code copied",
        description: "Share this code with the receiver",
      });
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Track Your Parcel</h1>
            <p className="text-xl text-muted-foreground">
              Enter your tracking code to see the status of your parcel
            </p>
          </div>

          {/* Search Form (shown when no tracking ID in URL) */}
          {showSearch && (
            <Card className="p-8 mb-8">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="trackingCode">Tracking Code</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="trackingCode"
                      placeholder="Enter tracking code (e.g., PORO-1234567890-ABC123)"
                      value={searchCode}
                      onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="flex-1"
                    />
                    <Button onClick={handleSearch} className="btn-hero">
                      <Search className="w-4 h-4 mr-2" />
                      Track
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Don't have a tracking code? Ask the sender to share it with you.
                </p>
              </div>
            </Card>
          )}

          {/* Loading State */}
          {isLoading && (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Loading parcel information...</p>
            </Card>
          )}

          {/* Parcel Details */}
          {!isLoading && parcel && (
            <div className="space-y-6">
              {/* Tracking Code Header */}
              <Card className="p-6 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Tracking Code</p>
                    <h2 className="text-2xl font-bold font-mono">{parcel.tracking_id}</h2>
                  </div>
                  <Button variant="outline" onClick={copyTrackingCode}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Code
                  </Button>
                </div>
              </Card>

              {/* Status Card */}
              <Card className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-semibold mb-2">
                      Parcel to {parcel.recipient_name}
                    </h3>
                    <Badge
                      style={{
                        backgroundColor: getStatusColor(parcel.status),
                        color: 'white',
                      }}
                      className="text-lg px-4 py-2"
                    >
                      {getStatusIcon(parcel.status)} {formatParcelStatus(parcel.status)}
                    </Badge>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="space-y-4 mb-6">
                  <div className={`flex items-center gap-3 ${parcel.status === null ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${parcel.status === null ? 'bg-primary text-white' : 'bg-muted'}`}>
                      {parcel.status === null ? '✓' : '1'}
                    </div>
                    <div>
                      <p className="font-semibold">Confirmed</p>
                      <p className="text-sm text-muted-foreground">Parcel booking confirmed</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 ${parcel.status === 'picked_up' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${parcel.status === 'picked_up' || parcel.status === 'in_transit' || parcel.status === 'delivered' ? 'bg-primary text-white' : 'bg-muted'}`}>
                      {parcel.status === 'picked_up' || parcel.status === 'in_transit' || parcel.status === 'delivered' ? '✓' : '2'}
                    </div>
                    <div>
                      <p className="font-semibold">Picked Up</p>
                      <p className="text-sm text-muted-foreground">Traveler has picked up the parcel</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 ${parcel.status === 'in_transit' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${parcel.status === 'in_transit' || parcel.status === 'delivered' ? 'bg-primary text-white' : 'bg-muted'}`}>
                      {parcel.status === 'in_transit' || parcel.status === 'delivered' ? '✓' : '3'}
                    </div>
                    <div>
                      <p className="font-semibold">In Transit</p>
                      <p className="text-sm text-muted-foreground">Parcel is on the way</p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-3 ${parcel.status === 'delivered' ? 'opacity-100' : 'opacity-50'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${parcel.status === 'delivered' ? 'bg-primary text-white' : 'bg-muted'}`}>
                      {parcel.status === 'delivered' ? '✓' : '4'}
                    </div>
                    <div>
                      <p className="font-semibold">Delivered</p>
                      <p className="text-sm text-muted-foreground">Parcel has been delivered</p>
                    </div>
                  </div>
                </div>

                {/* Trip Information */}
                {parcel.trip && (
                  <div className="border-t pt-6 space-y-4">
                    <h4 className="font-semibold text-lg">Trip Information</h4>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span>
                          <span className="font-medium">Route:</span> {parcel.trip.from} → {parcel.trip.to}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>
                          <span className="font-medium">Date:</span> {parcel.trip.date} {parcel.trip.time && `at ${parcel.trip.time}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span>
                          <span className="font-medium">Traveler:</span> {parcel.trip.name}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parcel Details */}
                <div className="border-t pt-6 space-y-4">
                  <h4 className="font-semibold text-lg">Parcel Details</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium mb-1">Description</p>
                      <p className="text-muted-foreground">{parcel.parcel_description}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Size</p>
                      <p className="text-muted-foreground">{parcel.parcel_size}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Pickup Point</p>
                      <p className="text-muted-foreground">{parcel.pickup_point}</p>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Recipient</p>
                      <p className="text-muted-foreground">{parcel.recipient_name}</p>
                      {parcel.recipient_phone && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {parcel.recipient_phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Location Information */}
                {parcel.location && (
                  <div className="border-t pt-6 space-y-4">
                    <h4 className="font-semibold text-lg">Last Known Location</h4>
                    <div className="flex items-center gap-2">
                      <NavIcon className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">{formatLocationSimple(parcel.location)}</span>
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

                {/* Timestamps */}
                <div className="border-t pt-6 space-y-2 text-sm text-muted-foreground">
                  {parcel.updated_at && (
                    <p>
                      <span className="font-medium">Last Updated:</span> {new Date(parcel.updated_at).toLocaleString()}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Created:</span> {new Date(parcel.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Search Another Parcel */}
                <div className="border-t pt-6">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSearch(true);
                      setSearchCode("");
                      navigate("/track");
                    }}
                    className="w-full"
                  >
                    Track Another Parcel
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* No Parcel Found (after search) */}
          {!isLoading && !parcel && trackingId && (
            <Card className="p-8 text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Parcel Not Found</h3>
              <p className="text-muted-foreground mb-4">
                No parcel found with tracking code: <strong>{trackingId}</strong>
              </p>
              <Button onClick={() => navigate("/track")} variant="outline">
                Try Another Code
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default PublicTracking;

