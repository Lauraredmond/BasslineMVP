import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

const FormatSelection = () => {
  const navigate = useNavigate();
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedIntensity, setSelectedIntensity] = useState<string>("");

  const handleBack = () => {
    navigate(-1);
  };

  const formats = [
    { id: 'spinning', label: 'Spinning', icon: '🚴‍♀️' },
    { id: 'pilates', label: 'Pilates', icon: '🧘‍♀️' },
    { id: 'circuits', label: 'Circuits', icon: '🏃‍♂️' },
    { id: 'hiit-strength', label: 'HIIT Strength', icon: '💪' },
    { id: 'hiit-cardio', label: 'HIIT Cardio', icon: '❤️' }
  ];

  const intensities = [
    { id: 'low', label: 'Low', color: 'bg-green-100 text-green-700 border-green-200' },
    { id: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    { id: 'high', label: 'High', color: 'bg-red-100 text-red-700 border-red-200' }
  ];

  const handleStartWorkout = () => {
    navigate('/music-sync', { 
      state: { 
        workoutType: 'spontaneous',
        format: selectedFormat, 
        intensity: selectedIntensity 
      } 
    });
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

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-cream mb-4">
            Pick Your Workout
          </h1>
          <p className="text-lg text-cream/80">
            Choose your workout format for today
          </p>
        </div>

        {/* Format Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-cream">Workout Format</h3>
          <div className="grid grid-cols-1 gap-3">
            {formats.map((format) => (
              <Card
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`
                  cursor-pointer transition-smooth shadow-card border-2 bg-card-texture
                  ${selectedFormat === format.id
                    ? 'border-cream bg-glow-gradient/20'
                    : 'border-cream/30 hover:border-cream/60'
                  }
                `}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{format.icon}</span>
                    <span className="font-medium text-lg text-primary">{format.label}</span>
                    <div className="ml-auto">
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center
                        ${selectedFormat === format.id
                          ? 'border-primary bg-primary'
                          : 'border-cream/50'
                        }
                      `}>
                        {selectedFormat === format.id && (
                          <span className="text-primary-foreground text-sm">✓</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Intensity Selection */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-cream">Intensity Level</h3>
          <div className="flex gap-3">
            {intensities.map((intensity) => (
              <Button
                key={intensity.id}
                onClick={() => setSelectedIntensity(intensity.id)}
                variant={selectedIntensity === intensity.id ? "default" : "outline"}
                className={`
                  flex-1 h-12 transition-smooth font-semibold
                  ${selectedIntensity === intensity.id
                    ? 'bg-energy-gradient text-cream'
                    : 'border-2 border-cream/50 text-cream/80 hover:border-cream hover:text-cream hover:bg-burgundy-dark/30'
                  }
                `}
              >
                {intensity.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="mb-20">
          <Button 
            onClick={handleStartWorkout}
            disabled={!selectedFormat || !selectedIntensity}
            className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 shadow-button transition-smooth disabled:opacity-50 text-cream font-semibold"
          >
            Start Workout Today
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default FormatSelection;