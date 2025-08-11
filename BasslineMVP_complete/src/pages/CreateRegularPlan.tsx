import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

const CreateRegularPlan = () => {
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dayWorkouts, setDayWorkouts] = useState<Record<string, { format: string; intensity: string }>>({});

  const days = [
    { id: 'monday', label: 'Monday', short: 'Mon' },
    { id: 'tuesday', label: 'Tuesday', short: 'Tue' },
    { id: 'wednesday', label: 'Wednesday', short: 'Wed' },
    { id: 'thursday', label: 'Thursday', short: 'Thu' },
    { id: 'friday', label: 'Friday', short: 'Fri' },
    { id: 'saturday', label: 'Saturday', short: 'Sat' },
    { id: 'sunday', label: 'Sunday', short: 'Sun' }
  ];

  const workoutFormats = [
    { id: 'spinning', label: 'Spinning' },
    { id: 'pilates', label: 'Pilates' },
    { id: 'circuits', label: 'Circuits' },
    { id: 'hiit', label: 'HIIT' }
  ];

  const intensityLevels = [
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' }
  ];

  const toggleDay = (dayId: string) => {
    setSelectedDays(prev => {
      if (prev.includes(dayId)) {
        // Remove day and its workout settings
        const newDayWorkouts = { ...dayWorkouts };
        delete newDayWorkouts[dayId];
        setDayWorkouts(newDayWorkouts);
        return prev.filter(id => id !== dayId);
      } else {
        // Add day with default workout settings
        setDayWorkouts(prev => ({
          ...prev,
          [dayId]: { format: '', intensity: '' }
        }));
        return [...prev, dayId];
      }
    });
  };

  const updateDayWorkout = (dayId: string, field: 'format' | 'intensity', value: string) => {
    setDayWorkouts(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [field]: value
      }
    }));
  };

  const handleConfirm = () => {
    navigate('/music-sync', { state: { selectedDays, dayWorkouts } });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const isConfirmDisabled = selectedDays.length === 0 || selectedDays.some(dayId => 
    !dayWorkouts[dayId]?.format || !dayWorkouts[dayId]?.intensity
  );

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
            Create Regular Plan
          </h1>
          <p className="text-lg text-cream/80">
            Select days and customize your workout routine
          </p>
        </div>

        {/* Weekly Calendar */}
        <Card className="mb-8 shadow-card border-0 bg-card-texture border border-cream/20">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center text-primary">
              Choose Your Workout Days
            </h3>
            
            <div className="grid grid-cols-1 gap-3">
              {days.map((day) => (
                 <div
                   key={day.id}
                   className={`
                     p-4 rounded-lg border-2 transition-smooth
                     ${selectedDays.includes(day.id)
                       ? 'border-burgundy bg-burgundy text-cream'
                       : 'border-cream/30 bg-card-texture text-burgundy hover:border-burgundy/60 hover:bg-burgundy-light'
                     }
                   `}
                 >
                   <div 
                     onClick={() => toggleDay(day.id)}
                     className="flex items-center justify-between cursor-pointer mb-4"
                   >
                     <span className="font-medium">{day.label}</span>
                     <div className={`
                       w-6 h-6 rounded-full border-2 flex items-center justify-center
                       ${selectedDays.includes(day.id)
                         ? 'border-cream bg-cream'
                         : 'border-burgundy/50'
                       }
                     `}>
                       {selectedDays.includes(day.id) && (
                         <span className="text-burgundy text-sm font-bold">✓</span>
                       )}
                     </div>
                   </div>

                   {/* Workout Format and Intensity Selectors */}
                   {selectedDays.includes(day.id) && (
                     <div className="grid grid-cols-2 gap-3 mt-4">
                       <div>
                         <label className="text-sm font-medium text-cream/90 mb-2 block">Format</label>
                         <Select
                           value={dayWorkouts[day.id]?.format || ''}
                           onValueChange={(value) => updateDayWorkout(day.id, 'format', value)}
                         >
                           <SelectTrigger className="h-9 bg-cream border-burgundy/30 text-burgundy">
                             <SelectValue placeholder="Choose..." />
                           </SelectTrigger>
                           <SelectContent className="bg-cream border-burgundy/30">
                             {workoutFormats.map((format) => (
                               <SelectItem 
                                 key={format.id} 
                                 value={format.id}
                                 className="text-burgundy hover:bg-burgundy-light"
                               >
                                 {format.label}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>

                       <div>
                         <label className="text-sm font-medium text-cream/90 mb-2 block">Intensity</label>
                         <Select
                           value={dayWorkouts[day.id]?.intensity || ''}
                           onValueChange={(value) => updateDayWorkout(day.id, 'intensity', value)}
                         >
                           <SelectTrigger className="h-9 bg-cream border-burgundy/30 text-burgundy">
                             <SelectValue placeholder="Choose..." />
                           </SelectTrigger>
                           <SelectContent className="bg-cream border-burgundy/30">
                             {intensityLevels.map((intensity) => (
                               <SelectItem 
                                 key={intensity.id} 
                                 value={intensity.id}
                                 className="text-burgundy hover:bg-burgundy-light"
                               >
                                 {intensity.label}
                               </SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>
                     </div>
                   )}
                 </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {selectedDays.length > 0 && (
          <Card className="mb-8 shadow-card border-0 bg-card-texture border border-cream/20">
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-primary font-medium">
                  {selectedDays.length} workout days selected
                </p>
                <p className="text-sm text-primary/70 mt-1">
                  Perfect! Consistency is key to success
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Confirm Button */}
         <div className="mb-20">
           <Button 
             onClick={handleConfirm}
             disabled={isConfirmDisabled}
             className="w-full h-14 text-lg bg-energy-gradient hover:opacity-90 shadow-button transition-smooth disabled:opacity-50 text-cream font-semibold"
           >
             Confirm Schedule
           </Button>
         </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default CreateRegularPlan;