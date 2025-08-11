import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PersonalProfile = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-energy-gradient bg-clip-text text-transparent mb-2">
            Personal Profile
          </h1>
          <p className="text-sm text-cream/80">
            Your fitness journey, your way
          </p>
        </div>

        {/* Profile Info */}
        <div className="space-y-6">
          <Card className="bg-card-texture border-cream/20 shadow-glow">
            <CardHeader>
              <CardTitle className="text-cream text-lg">Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-energy-gradient rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl text-cream">👤</span>
                </div>
                <h3 className="text-xl font-semibold text-cream">Your Name</h3>
                <p className="text-cream/70">Bassline Member</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card-texture border-cream/20 shadow-glow">
            <CardHeader>
              <CardTitle className="text-cream text-lg">Fitness Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-cream/90">
                  <span>Current Goal:</span>
                  <span className="font-medium">Build Strength</span>
                </div>
                <div className="flex justify-between text-cream/90">
                  <span>Weekly Target:</span>
                  <span className="font-medium">4 workouts</span>
                </div>
                <div className="flex justify-between text-cream/90">
                  <span>Preferred Style:</span>
                  <span className="font-medium">Music-Sync Training</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card-texture border-cream/20 shadow-glow">
            <CardHeader>
              <CardTitle className="text-cream text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-cream/90">
                  <span>Workouts This Week:</span>
                  <span className="font-medium">3</span>
                </div>
                <div className="flex justify-between text-cream/90">
                  <span>Total Sessions:</span>
                  <span className="font-medium">47</span>
                </div>
                <div className="flex justify-between text-cream/90">
                  <span>Favorite Genre:</span>
                  <span className="font-medium">Electronic</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button className="w-full bg-energy-gradient hover:opacity-90 text-cream font-semibold">
              Edit Profile
            </Button>
            <Button variant="outline" className="w-full">
              Workout History
            </Button>
            <Button variant="outline" className="w-full">
              Settings
            </Button>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default PersonalProfile;