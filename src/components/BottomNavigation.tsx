import { useNavigate, useLocation } from "react-router-dom";
import { Home, UserRound, BarChart3 } from "lucide-react";
import { bottomNav } from "@/config/nav";

const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-premium-texture border-t border-cream/30 px-4 py-3 shadow-glow">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {bottomNav.map((item) => (
          <button
            key={item.key}
            onClick={() => navigate(item.to)}
            className={`
              flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-smooth
              ${location.pathname === item.to
                ? 'text-cream bg-burgundy-dark/30'
                : 'text-cream/60 hover:text-cream hover:bg-burgundy-dark/20'
              }
            `}
          >
            {item.icon === 'home' ? (
              <Home className="w-5 h-5" />
            ) : item.icon === 'user-round' ? (
              <UserRound className="w-5 h-5" />
            ) : item.key === 'analytics' ? (
              <BarChart3 className="w-5 h-5" />
            ) : (
              <span className="text-lg">{item.icon}</span>
            )}
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export { BottomNavigation };