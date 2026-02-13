import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/hooks/use-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Lazy-load pages so only the current route is in the initial bundle
const Index = lazy(() => import("./pages/Index"));
const SendParcel = lazy(() => import("./pages/SendParcel"));
const BecomeTraveler = lazy(() => import("./pages/BecomeTraveler"));
const Login = lazy(() => import("./pages/Login"));
const TravelerTracking = lazy(() => import("./pages/TravelerTracking"));
const SenderTracking = lazy(() => import("./pages/SenderTracking"));
const PublicTracking = lazy(() => import("./pages/PublicTracking"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-pulse flex flex-col items-center gap-3">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ToastProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </BrowserRouter>
      </ToastProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;