import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      <div className="flex-1 px-4 pt-4 pb-24">
        {/* Back Button */}
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-4 p-2 hover:bg-burgundy-dark/20"
        >
          <ArrowLeft className="w-5 h-5 text-cream" />
        </Button>

        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 text-cream">404</h1>
            <p className="text-xl text-cream/80 mb-4">Oops! Page not found</p>
            <Button 
              onClick={() => navigate('/')} 
              className="bg-energy-gradient hover:opacity-90 text-cream font-semibold"
            >
              Return to Home
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default NotFound;
