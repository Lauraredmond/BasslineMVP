import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import heroEmpoweredWoman from "../assets/hero-empowered-woman.jpg";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Logo } from "@/components/Logo";
import { DatabaseTest } from "@/components/DatabaseTest";
import { WorkoutNarrativeTest } from "@/components/WorkoutNarrativeSystem";

const Index = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      <div className="flex-1 px-4 pt-2">
        {/* Back Button */}
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-2 p-2 hover:bg-burgundy-dark/20"
        >
          <ArrowLeft className="w-5 h-5 text-cream" />
        </Button>
        {/* Logo */}
        <div className="text-center mb-4">
          <div className="flex justify-center mb-2">
            <Logo size="xl" />
          </div>
          <p className="text-lg text-cream font-medium">
            Music-Powered Fitness
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 shadow-glow">
          <img 
            src={heroEmpoweredWoman} 
            alt="Empowered woman at the height of her fitness journey" 
            className="w-full h-full object-cover transform hover:scale-105 transition-smooth"
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-20"></div>
        </div>

        {/* Main Action Buttons - Updated hover states for better readability */}
        <div className="space-y-3 mb-4">
          <Button 
            onClick={() => navigate('/music-sync')}
            className="w-full h-14 text-lg bg-energy-gradient shadow-button transition-smooth text-cream font-semibold hover:!bg-cream hover:!text-maroon"
          >
            Take me to my existing plan
          </Button>
          
          <Button 
            onClick={() => navigate('/plan-creator')}
            className="w-full h-14 text-lg bg-energy-gradient shadow-button transition-smooth text-cream font-semibold hover:!bg-cream hover:!text-maroon"
          >
            Create a new plan
          </Button>
          
          <Button 
            onClick={() => navigate('/format-selection')}
            className="w-full h-14 text-lg bg-energy-gradient shadow-button transition-smooth text-cream font-medium hover:!bg-cream hover:!text-maroon"
          >
            No plan? Take me to format selection
          </Button>
          
          <Button 
            onClick={() => navigate('/audio-timestamping')}
            className="w-full h-14 text-lg bg-burgundy-dark shadow-button transition-smooth text-cream font-medium hover:!bg-cream hover:!text-maroon border border-cream/30"
          >
            Audio Timestamping Tool
          </Button>
        </div>

        {/* Debug Components (only show when explicitly requested) */}
        {new URLSearchParams(window.location.search).get('debug') === 'true' && (
          <>
            <DatabaseTest />
            <WorkoutNarrativeTest />
          </>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;
