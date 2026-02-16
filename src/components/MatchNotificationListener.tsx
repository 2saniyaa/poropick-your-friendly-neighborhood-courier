import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { genId } from "@/hooks/use-toast";
import { supabase } from "@/integrations/firebase";
import Button from "@/components/ui/button";

/**
 * When the current user is the traveler (recipient), listens for new "trip_matched"
 * notifications and shows a toast: "New delivery request" with View + Dismiss.
 */
export default function MatchNotificationListener() {
  const navigate = useNavigate();
  const { toast, dismiss } = useToast();
  const mountedAt = useRef<number>(0);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.uid ?? (session?.user as { id?: string })?.id;
      if (!uid) return;

      mountedAt.current = Date.now();
      channel = supabase.channel(`match-notifications-${uid}`);
      channel.on(
        "postgres_changes",
        {
          event: "INSERT",
          table: "notifications",
          filter: `recipient_user_id=eq.${uid}`,
        },
        (payload: { new?: { type?: string; trip_from?: string; trip_to?: string } }) => {
          const data = payload?.new;
          if (!data || data.type !== "trip_matched") return;
          if (Date.now() - mountedAt.current < 2500) return;
          const from = data.trip_from ?? "";
          const to = data.trip_to ?? "";
          const description = from || to ? `A sender selected you for ${from} → ${to}.` : "A sender matched with your trip.";
          const toastId = genId();
          toast({
            id: toastId,
            title: "New delivery request",
            description,
            action: (
              <div className="flex gap-2 mt-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    dismiss(toastId);
                    navigate("/traveler-tracking");
                  }}
                >
                  View
                </Button>
                <Button size="sm" variant="outline" onClick={() => dismiss(toastId)}>
                  Dismiss
                </Button>
              </div>
            ),
          });
        }
      );
      (channel as { subscribe?: () => void }).subscribe?.();
    };

    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [toast, dismiss, navigate]);

  return null;
}
