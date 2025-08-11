import { useState } from "react";
import logo from "../assets/Logo4.jpg";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showTooltip?: boolean;
}

const Logo = ({ className = "", size = "md", showTooltip = true }: LogoProps) => {
  const [showCredit, setShowCredit] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-auto",
    md: "h-12 w-auto", 
    lg: "h-16 w-auto",
    xl: "h-24 w-auto"
  };

  return (
    <div className="relative inline-block">
      <img
        src={logo}
        alt="Bassline - Music-Powered Fitness"
        className={`${sizeClasses[size]} ${className} transition-transform hover:scale-105 cursor-pointer rounded-lg shadow-md`}
        onMouseEnter={() => showTooltip && setShowCredit(true)}
        onMouseLeave={() => setShowCredit(false)}
        onClick={() => setShowCredit(!showCredit)}
      />
      
      {showTooltip && showCredit && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-burgundy-dark/90 text-cream text-xs rounded-lg shadow-lg border border-cream/20 whitespace-nowrap z-50">
          <div className="text-center">
            <div className="font-medium">Logo by Cian Ryan</div>
            <div className="text-cream/70 text-xs">Creative Design</div>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-burgundy-dark/90"></div>
        </div>
      )}
    </div>
  );
};

export { Logo };