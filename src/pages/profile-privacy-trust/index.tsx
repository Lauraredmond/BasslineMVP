import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BottomNavigation } from "@/components/BottomNavigation";

const ProfilePrivacyTrust = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-premium-texture text-cream">
      <div className="container mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Profile, Privacy & Trust</h1>
          <p className="text-cream/70">Manage your account, privacy settings, and trust preferences</p>
        </div>

        <div className="grid gap-6 max-w-2xl mx-auto">
          <Card className="bg-burgundy-dark/40 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream flex items-center gap-2">
                <span className="text-2xl">👤</span>
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-cream/70 mb-4">
                Manage your personal profile, preferences, and account settings.
              </p>
              <Button 
                onClick={() => navigate('/personal-profile')}
                className="w-full bg-burgundy hover:bg-burgundy-light text-cream"
              >
                Go to Profile
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-burgundy-dark/40 border-cream/20">
            <CardHeader>
              <CardTitle className="text-cream flex items-center gap-2">
                <span className="text-2xl">🔒</span>
                Privacy & Trust
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-cream/70 mb-4">
                Review our privacy policy, data handling practices, and compliance standards.
              </p>
              <Button 
                onClick={() => navigate('/privacy')}
                className="w-full bg-burgundy hover:bg-burgundy-light text-cream"
              >
                Go to Privacy
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <BottomNavigation />
    </div>
  );
};

export default ProfilePrivacyTrust;