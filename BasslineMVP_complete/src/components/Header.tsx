import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "./Logo";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  showLogo?: boolean;
  logoSize?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Header = ({ 
  title, 
  showBackButton = true, 
  showLogo = true, 
  logoSize = "sm",
  className = "" 
}: HeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className={`flex items-center justify-between p-4 ${className}`}>
      {/* Left side - Back button */}
      <div className="flex items-center">
        {showBackButton && (
          <Button
            onClick={handleBack}
            variant="ghost"
            className="p-2 hover:bg-burgundy-dark/20 mr-3"
          >
            <ArrowLeft className="w-5 h-5 text-cream" />
          </Button>
        )}
      </div>

      {/* Center - Logo and/or Title */}
      <div className="flex items-center gap-3">
        {showLogo && (
          <button 
            onClick={handleHome}
            className="transition-transform hover:scale-105"
            title="Go to Home"
          >
            <Logo size={logoSize} showTooltip={false} />
          </button>
        )}
        {title && (
          <h1 className="text-xl font-semibold text-cream">
            {title}
          </h1>
        )}
      </div>

      {/* Right side - Home button (if not showing back button) */}
      <div className="flex items-center">
        {!showBackButton && (
          <Button
            onClick={handleHome}
            variant="ghost"
            className="p-2 hover:bg-burgundy-dark/20"
            title="Home"
          >
            <Home className="w-5 h-5 text-cream" />
          </Button>
        )}
      </div>
    </div>
  );
};

export { Header };