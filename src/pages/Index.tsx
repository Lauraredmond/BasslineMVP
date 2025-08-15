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
      <div className="flex-1 px-4 pt-4">
        {/* Back Button */}
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-4 p-2 hover:bg-burgundy-dark/20"
        >
          <ArrowLeft className="w-5 h-5 text-cream" />
        </Button>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="xl" />
          </div>
          <p className="text-lg text-cream font-medium">
            Music-Powered Fitness
          </p>
        </div>

        {/* Hero Image */}
        <div className="relative w-full h-64 rounded-xl overflow-hidden mb-8 shadow-glow">
          <img 
            src={heroEmpoweredWoman} 
            alt="Empowered woman at the height of her fitness journey" 
            className="w-full h-full object-cover transform hover:scale-105 transition-smooth"
          />
          <div className="absolute inset-0 bg-hero-gradient opacity-20"></div>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-4 mb-20">
          <Button 
            onClick={() => navigate('/music-sync')}
            className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 shadow-button transition-smooth text-cream font-semibold"
          >
            Take me to my existing plan
          </Button>
          
          <Button 
            onClick={() => navigate('/plan-creator')}
            variant="outline"
            className="w-full h-14 text-lg border-2 border-cream text-cream hover:bg-card-texture transition-smooth font-semibold"
          >
            Create a new plan
          </Button>
          
          <Button 
            onClick={() => navigate('/format-selection')}
            variant="outline"
            className="w-full h-14 text-lg border-2 border-cream/70 text-cream/80 hover:border-cream hover:text-cream hover:bg-card-texture transition-smooth font-medium"
          >
            No plan? Take me to format selection
          </Button>
        </div>

        {/* Database Test Component */}
        <DatabaseTest />

        {/* Automatic Warmup Narratives */}
        <WorkoutNarrativeTest />
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Index;
