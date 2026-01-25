import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Package } from "lucide-react";

interface MatchButtonProps {
  tripId: string;
  travelerId: string;
  currentUserId: string;
  tripFrom?: string;
  tripTo?: string;
  existingMatch?: any;
  onMatchChange?: () => void;
}

const MatchButton = ({
  tripId,
  travelerId,
  currentUserId,
  tripFrom,
  tripTo,
}: MatchButtonProps) => {
  const navigate = useNavigate();

  // Own trip - don't show button
  if (travelerId === currentUserId) {
    return null;
  }

  const handleBookTrip = () => {
    // Redirect to SendParcel page with trip pre-selected
    navigate("/send-parcel", {
      state: {
        preSelectedTrip: {
          id: tripId,
          from: tripFrom,
          to: tripTo,
        },
        preFillFrom: tripFrom,
        preFillTo: tripTo,
      },
    });
  };

  return (
    <Button
      onClick={handleBookTrip}
      className="btn-hero"
    >
      <Package className="w-4 h-4 mr-2" />
      Book This Trip
    </Button>
  );
};

export default MatchButton;
