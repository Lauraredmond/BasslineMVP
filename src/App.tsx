import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PlanCreator from "./pages/PlanCreator";
import TrainerNetwork from "./pages/TrainerNetwork";
import CreateRegularPlan from "./pages/CreateRegularPlan";
import FormatSelection from "./pages/FormatSelection";
import MusicSync from "./pages/MusicSync";
import PrivacyCompliance from "./pages/PrivacyCompliance";
import FounderStory from "./pages/FounderStory";
import PersonalProfile from "./pages/PersonalProfile";
import Analytics from "./pages/Analytics";
import CustomerSupport from "./pages/CustomerSupport";
import Community from "./pages/Community";
import SpotifyCallback from "./pages/SpotifyCallback";
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
          <Route path="/plan-creator" element={<PlanCreator />} />
          <Route path="/trainer-network" element={<TrainerNetwork />} />
          <Route path="/create-plan" element={<CreateRegularPlan />} />
          <Route path="/format-selection" element={<FormatSelection />} />
          <Route path="/music-sync" element={<MusicSync />} />
          <Route path="/privacy" element={<PrivacyCompliance />} />
          <Route path="/founder-story" element={<FounderStory />} />
          <Route path="/personal-profile" element={<PersonalProfile />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/support" element={<CustomerSupport />} />
          <Route path="/community" element={<Community />} />
          <Route path="/callback" element={<SpotifyCallback />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
