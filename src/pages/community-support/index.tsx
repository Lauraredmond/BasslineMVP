import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";

const CommunitySupport = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-premium-texture text-cream">
      <div className="container mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Community & Support</h1>
          <p className="text-cream/70">Connect with others and get help when you need it</p>
        </div>

        <div className="grid gap-6 max-w-2xl mx-auto">
          <Card className="bg-burgundy-dark/40 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream flex items-center gap-2">
                <span className="text-2xl">👥</span>
                Community
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-cream/70 mb-4">
                Join our community of fitness enthusiasts, share your progress, and get motivated by others.
              </p>
              <Button 
                onClick={() => navigate('/community')}
                className="w-full bg-burgundy hover:bg-burgundy-light text-cream"
              >
                Go to Community
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-burgundy-dark/40 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream flex items-center gap-2">
                <span className="text-2xl">💬</span>
                Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-cream/70 mb-4">
                Get help with your account, technical issues, or questions about using Bassline.
              </p>
              <Button 
                onClick={() => navigate('/support')}
                className="w-full bg-burgundy hover:bg-burgundy-light text-cream"
              >
                Go to Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default CommunitySupport;