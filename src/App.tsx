import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import SendParcel from "./pages/SendParcel";
import BecomeTraveler from "./pages/BecomeTraveler";
import Login from "./pages/Login";
import TravelerTracking from "./pages/TravelerTracking";
import SenderTracking from "./pages/SenderTracking";
import PublicTracking from "./pages/PublicTracking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/send-parcel" element={<SendParcel />} />
          <Route path="/become-traveler" element={<BecomeTraveler />} />
          <Route path="/login" element={<Login />} />
          <Route path="/traveler-tracking" element={<TravelerTracking />} />
          <Route path="/sender-tracking" element={<SenderTracking />} />
          <Route path="/track" element={<PublicTracking />} />
          <Route path="/track/:trackingId" element={<PublicTracking />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
