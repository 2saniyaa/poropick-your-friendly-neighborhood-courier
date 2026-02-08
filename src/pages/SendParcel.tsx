import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/firebase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, Calendar, DollarSign, Search } from "lucide-react";

interface Trip {
  id: string;
  name: string;
  email: string;
  from: string;
  to: string;
  date: string;
  time: string;
  space: string;
  status: string;
}

const SendParcel = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    senderName: "",
    senderPhone: "",
    recipientName: "",
    recipientPhone: "",
    parcelSize: "",
    parcelDescription: "",
    specialInstructions: "",
    photo: null as File | null,
    pickupPoint: "",
    from: "",
    to: "",
  });

  const defaultPickupPoint = "Closest Train Station";

  // Handle pre-selected trip from navigation (e.g., from BecomeTraveler page)
  useEffect(() => {
    const state = location.state as any;
    if (state?.preSelectedTrip) {
      const trip = state.preSelectedTrip;
      const from = state.preFillFrom || "";
      const to = state.preFillTo || "";
      
      setFormData((prev) => ({
        ...prev,
        from: from,
        to: to,
      }));
      setSelectedTripId(trip.id);
      
      // Search for trips and select the pre-selected one
      const searchTripsForPreSelected = async () => {
        if (!from || !to) return;

        setIsSearching(true);
        try {
          const { data: allTrips, error: tripsError } = await supabase
            .from("trips")
            .select("*")
            .order("created_at", { ascending: false });

          if (tripsError) throw tripsError;

          const { data: allParcels, error: parcelsError } = await supabase
            .from("parcels")
            .select("trip_id");

          if (parcelsError) throw parcelsError;

          const bookedTripIds = new Set((allParcels || []).map((p: any) => p.trip_id));

          const filtered = (allTrips || []).filter((trip: any) => {
            const fromMatch = trip.from?.toLowerCase().includes(from.toLowerCase());
            const toMatch = trip.to?.toLowerCase().includes(to.toLowerCase());
            const notBooked = !bookedTripIds.has(trip.id);
            return fromMatch && toMatch && notBooked;
          });

          setAvailableTrips(filtered);
          
          // If the pre-selected trip is in the results, jump to step 4
          if (filtered.some((t: any) => t.id === trip.id)) {
            setStep(4);
          } else {
            setStep(3);
          }
        } catch (error: any) {
          toast({
            title: "Error searching trips",
            description: error.message,
            variant: "destructive",
          });
        } finally {
          setIsSearching(false);
        }
      };
      
      searchTripsForPreSelected();
    }
  }, [location.state, toast]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to send a parcel.",
          variant: "destructive",
        });
        navigate("/login", { replace: true });
      } else {
        setUser(session.user);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login", { replace: true });
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  // Search for available trips
  const searchTrips = async () => {
    if (!formData.from || !formData.to) {
      toast({
        title: "Location required",
        description: "Please enter both From and To locations",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    try {
      // Get all trips
      const { data: allTrips, error: tripsError } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (tripsError) {
        throw tripsError;
      }

      // Get all parcels to find booked trips
      const { data: allParcels, error: parcelsError } = await supabase
        .from("parcels")
        .select("trip_id");

      if (parcelsError) {
        throw parcelsError;
      }

      const bookedTripIds = new Set((allParcels || []).map((p: any) => p.trip_id));

      // Filter trips: match from/to and exclude booked trips
      const filtered = (allTrips || []).filter((trip: any) => {
        const fromMatch = trip.from?.toLowerCase().includes(formData.from.toLowerCase());
        const toMatch = trip.to?.toLowerCase().includes(formData.to.toLowerCase());
        const notBooked = !bookedTripIds.has(trip.id);
        return fromMatch && toMatch && notBooked;
      });

      setAvailableTrips(filtered);
      
      if (filtered.length === 0) {
        toast({
          title: "No trips found",
          description: "No available trips match your route. Try different locations.",
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error searching trips",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (field: string, value: string | File | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTripId) {
      toast({
        title: "Trip selection required",
        description: "Please select a trip to continue.",
        variant: "destructive",
      });
      return;
    }

    // Validate all required fields
    const requiredFields = [
      { key: 'senderName', label: 'Sender Name' },
      { key: 'senderPhone', label: 'Sender Phone' },
      { key: 'recipientName', label: 'Recipient Name' },
      { key: 'recipientPhone', label: 'Recipient Phone' },
      { key: 'parcelSize', label: 'Parcel Size' },
      { key: 'parcelDescription', label: 'Parcel Description' },
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field.key as keyof typeof formData]
    );

    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to send a parcel.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
      return;
    }

    try {
      const userId = user.uid || user.id;
      const senderEmail = user.email || "";

      // Generate tracking ID
      const trackingId = `PORO-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create parcel record
      const parcelData = {
        trip_id: selectedTripId,
        sender_id: userId,
        sender_email: senderEmail,
        sender_name: formData.senderName,
        sender_phone: formData.senderPhone,
        recipient_name: formData.recipientName,
        recipient_phone: formData.recipientPhone,
        recipient_address: null,
        parcel_description: formData.parcelDescription,
        parcel_size: formData.parcelSize,
        special_instructions: formData.specialInstructions || null,
        pickup_point: formData.pickupPoint || defaultPickupPoint,
        status: null, // New parcel
        location: null,
        tracking_id: trackingId,
      };

      const { error } = await supabase.from("parcels").insert([parcelData]);

      if (error) {
        throw error;
      }

      // Generate tracking URL
      const trackingUrl = `${window.location.origin}/track/${trackingId}`;

    toast({
      title: "Parcel Request Submitted!",
        description: `Your parcel has been booked. Tracking Code: ${trackingId}. Share this link with the receiver: ${trackingUrl}`,
        duration: 10000, // Show for 10 seconds
      });

      // Reset form and navigate
      setFormData({
        senderName: "",
        senderPhone: "",
        recipientName: "",
        recipientPhone: "",
        parcelSize: "",
        parcelDescription: "",
        specialInstructions: "",
        photo: null,
        pickupPoint: "",
        from: "",
        to: "",
      });
      setSelectedTripId("");
      setStep(1);
      navigate("/sender-tracking");
    } catch (error: any) {
      toast({
        title: "Error submitting parcel",
        description: error.message,
        variant: "destructive",
    });
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Send a Parcel</h1>
            <p className="text-xl text-muted-foreground">
              Fill in the details and we'll connect you with verified travelers
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-between mb-12">
            <div className={`flex flex-col items-center ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Location</span>
            </div>
            <div className={`flex flex-col items-center ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Package className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Parcel Details</span>
            </div>
            <div className={`flex flex-col items-center ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Calendar className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Find Trip</span>
            </div>
            <div className={`flex flex-col items-center ${step >= 4 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Package className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Sender Info</span>
            </div>
          </div>

          <Card className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {step === 1 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <Label htmlFor="from">From Location *</Label>
                    <Input 
                      id="from" 
                      name="from"
                      placeholder="e.g., Helsinki, Keskusta" 
                      className="mt-2" 
                      required 
                      value={formData.from}
                      onChange={(e) => handleInputChange('from', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="to">To Location *</Label>
                    <Input 
                      id="to" 
                      name="to"
                      placeholder="e.g., Oulu, City Center" 
                      className="mt-2" 
                      required 
                      value={formData.to}
                      onChange={(e) => handleInputChange('to', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickupPoint">Pickup Point *</Label>
                    <Input 
                      id="pickupPoint" 
                      name="pickupPoint"
                      placeholder={defaultPickupPoint}
                      className="mt-2" 
                      required 
                      value={formData.pickupPoint || defaultPickupPoint}
                      onChange={(e) => handleInputChange('pickupPoint', e.target.value)}
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (!formData.from || !formData.to) {
                        toast({
                          title: "Required fields missing",
                          description: "Please fill in From and To locations",
                          variant: "destructive",
                        });
                        return;
                      }
                      setStep(2);
                    }} 
                    className="w-full btn-hero"
                  >
                    Continue
                  </Button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <Label htmlFor="parcelSize">Parcel Size *</Label>
                    <Select 
                      required
                      value={formData.parcelSize}
                      onValueChange={(value) => handleInputChange('parcelSize', value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select parcel size" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="extra-large">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="parcelDescription">Parcel Description *</Label>
                    <Textarea
                      id="parcelDescription"
                      name="parcelDescription"
                      placeholder="Describe your parcel (contents, fragility, etc.)"
                      className="mt-2"
                      rows={4}
                      required
                      value={formData.parcelDescription}
                      onChange={(e) => handleInputChange('parcelDescription', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialInstructions">Special Instructions *</Label>
                    <Textarea
                      id="specialInstructions"
                      name="specialInstructions"
                      placeholder="Any special handling instructions"
                      className="mt-2"
                      rows={3}
                      required
                      value={formData.specialInstructions}
                      onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="photo">Photo (Optional)</Label>
                    <Input 
                      id="photo" 
                      type="file" 
                      accept="image/*"
                      className="mt-2"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        handleInputChange('photo', file);
                      }}
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full">
                      Back
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => {
                        if (!formData.parcelSize || !formData.parcelDescription || !formData.specialInstructions) {
                          toast({
                            title: "Required fields missing",
                            description: "Please fill in all parcel details",
                            variant: "destructive",
                          });
                          return;
                        }
                        setStep(3);
                      }} 
                      className="w-full btn-hero"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <Label>Search for Available Trips</Label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        placeholder="From location" 
                        value={formData.from}
                        onChange={(e) => handleInputChange('from', e.target.value)}
                        className="flex-1"
                      />
                      <Input 
                        placeholder="To location" 
                        value={formData.to}
                        onChange={(e) => handleInputChange('to', e.target.value)}
                        className="flex-1"
                      />
                      <Button 
                        type="button" 
                        onClick={searchTrips}
                        disabled={isSearching || !formData.from || !formData.to}
                        className="btn-hero"
                      >
                        {isSearching ? "Searching..." : "Search"}
                      </Button>
                    </div>
                  </div>

                  {availableTrips.length > 0 && (
                    <div className="space-y-3">
                      <Label>Available Trips</Label>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {availableTrips.map((trip) => (
                          <Card 
                            key={trip.id} 
                            className={`p-4 transition-all ${
                              selectedTripId === trip.id 
                                ? 'border-primary border-2 bg-primary/5' 
                                : 'hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <MapPin className="w-4 h-4 text-primary" />
                                  <span className="font-semibold">
                                    {trip.from} → {trip.to}
                                  </span>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <span>Traveler: {trip.name}</span>
                                    <span>Date: {trip.date ? new Date(trip.date).toLocaleDateString() : trip.date}</span>
                                    {trip.time && <span>Time: {trip.time}</span>}
                                  </div>
                                  <div>Available Space: {trip.space}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {selectedTripId === trip.id && (
                                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                    <span className="text-white text-xs">✓</span>
                                  </div>
                                )}
                                <Button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTripId(trip.id);
                                    setStep(4);
                                  }}
                                  className="btn-hero whitespace-nowrap"
                                  size="sm"
                                >
                                  Book This Trip
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableTrips.length === 0 && !isSearching && formData.from && formData.to && (
                    <Card className="p-6 text-center">
                      <p className="text-muted-foreground">
                        No available trips found. Try different locations or check back later.
                      </p>
                    </Card>
                  )}

                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full">
                      Back
                    </Button>
                    {selectedTripId && (
                      <Button 
                        type="button" 
                        onClick={() => setStep(4)} 
                        className="w-full btn-hero"
                      >
                        Continue with Selected Trip
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <Label htmlFor="senderName">Sender Name *</Label>
                    <Input 
                      id="senderName" 
                      name="senderName"
                      placeholder="Your full name" 
                      className="mt-2" 
                      required 
                      value={formData.senderName}
                      onChange={(e) => handleInputChange('senderName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="senderPhone">Sender Phone *</Label>
                    <Input 
                      id="senderPhone" 
                      name="senderPhone"
                      type="tel" 
                      placeholder="+358 XX XXX XXXX" 
                      className="mt-2" 
                      required 
                      value={formData.senderPhone}
                      onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientName">Recipient Name *</Label>
                    <Input 
                      id="recipientName" 
                      name="recipientName"
                      placeholder="Recipient's full name" 
                      className="mt-2" 
                      required 
                      value={formData.recipientName}
                      onChange={(e) => handleInputChange('recipientName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="recipientPhone">Recipient Phone *</Label>
                    <Input 
                      id="recipientPhone" 
                      name="recipientPhone"
                      type="tel" 
                      placeholder="+358 XX XXX XXXX" 
                      className="mt-2" 
                      required 
                      value={formData.recipientPhone}
                      onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button type="button" variant="outline" onClick={() => setStep(3)} className="w-full">
                      Back
                    </Button>
                    <Button type="submit" className="w-full btn-hero">
                      Submit Request
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SendParcel;
