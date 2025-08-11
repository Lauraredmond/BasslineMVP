import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import heroPlanningSuccess from "../assets/hero-planning-success.jpg";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Header } from "@/components/Header";

const PlanCreator = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      {/* Header */}
      <Header title="Plan Creator" />
      
      <div className="flex-1 px-4">
        {/* Hero Image */}
        <div className="relative w-full h-48 rounded-xl overflow-hidden mb-6 shadow-glow">
          <img 
            src={heroPlanningSuccess} 
            alt="Woman planning her successful fitness journey" 
            className="w-full h-full object-cover transform hover:scale-105 transition-smooth"
          />
          <div className="absolute inset-0 bg-glow-gradient opacity-15"></div>
        </div>

        {/* Content */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cream mb-4">
            Design Your Routine
          </h1>
          <p className="text-lg text-cream/80 leading-relaxed">
            How can I help you build a routine that suits your needs & lifestyle?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-20">
          <Button 
            onClick={() => navigate('/create-plan')}
            className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 shadow-button transition-smooth text-cream font-semibold"
          >
            Create My Regular Plan
          </Button>
          
          <Button 
            onClick={() => navigate('/trainer-network')}
            variant="outline"
            className="w-full h-14 text-lg font-semibold"
          >
            Connect with Trainer
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default PlanCreator;