import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

const TrainerNetwork = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const trainers = [
    {
      id: 1,
      name: "Jane Doe",
      specialties: ["Crossfit", "HIIT"],
      specializedTags: ["Mental Health", "Postpartum"],
      rating: 5,
      testimonials: 24,
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400",
      bio: "Certified trainer with 8+ years experience in high-intensity workouts",
      multidisciplinarySupport: [
        "Collaborates with GPs to support clients managing anxiety and fitness post-pregnancy",
        "Designs high-intensity programs that build confidence for clients overcoming mental health challenges"
      ]
    },
    {
      id: 2,
      name: "Mike Chen",
      specialties: ["Strength", "Powerlifting"],
      specializedTags: ["Injury Recovery", "Older Adults", "Chronic Conditions"],
      rating: 4.9,
      testimonials: 18,
      image: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400",
      bio: "Former competitive athlete specializing in strength building",
      multidisciplinarySupport: [
        "Designs progressive lifting programs for older adults recovering from joint surgery",
        "Works with physiotherapists to create safe strength training for clients with arthritis and diabetes"
      ]
    },
    {
      id: 3,
      name: "Sarah Williams",
      specialties: ["Yoga", "Pilates"],
      specializedTags: ["Mental Health", "Chronic Conditions", "Obesity Support"],
      rating: 5,
      testimonials: 31,
      image: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=400",
      bio: "Mindful movement specialist with holistic wellness approach",
      multidisciplinarySupport: [
        "Integrates mindfulness practices with movement therapy for clients managing chronic pain and stress",
        "Collaborates with nutritionists and mental health professionals for holistic weight management support"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 px-4 pt-4">
        {/* Back Button */}
        <Button
          onClick={handleBack}
          variant="ghost"
          className="mb-4 p-2 hover:bg-burgundy-dark/20"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Personal Trainers
          </h1>
          <p className="text-muted-foreground mb-4">
            Choose your perfect fitness partner
          </p>
          <div className="bg-energy-gradient bg-clip-text text-transparent">
            <p className="text-lg font-medium italic">
              "When the student is ready, the teacher appears."
            </p>
          </div>
        </div>

        {/* AI-Powered Case Matching Panel */}
        <Card className="shadow-card border-0 mb-6">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Find Your Perfect Trainer
            </h3>
            <div className="space-y-4">
              <textarea 
                className="w-full p-3 border border-input rounded-md bg-background text-foreground resize-none"
                rows={3}
                placeholder="Tell us what you need help with (e.g. recovering from surgery, managing anxiety, postnatal strength, weight loss after 50)…"
              />
              <Button className="bg-primary hover:bg-burgundy-dark">
                Find My Trainer
              </Button>
              <p className="text-sm text-muted-foreground italic">
                We recommend: Mike Chen – Specialist in injury recovery and strength training for older adults.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 mb-20">
          {trainers.map((trainer) => (
            <Card key={trainer.id} className="shadow-card border-0">
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={trainer.image} 
                      alt={trainer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {trainer.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-burgundy">★</span>
                        <span className="text-sm font-medium">{trainer.rating}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {trainer.specialties.map((specialty) => (
                        <Badge key={specialty} variant="secondary" className="bg-burgundy-light text-primary">
                          {specialty}
                        </Badge>
                      ))}
                      {trainer.specializedTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-primary text-primary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
                      {trainer.bio}
                    </p>

                    {/* Multidisciplinary Support & Case Management */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-foreground mb-2">
                        Multidisciplinary Support & Case Management
                      </h4>
                      <ul className="space-y-1">
                        {trainer.multidisciplinarySupport.map((point, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex items-start">
                            <span className="text-primary mr-2">•</span>
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <Button size="sm" className="bg-primary hover:bg-burgundy-dark">
                        Message
                      </Button>
                      <Button size="sm" variant="outline" className="border-primary text-primary">
                        Video Call
                      </Button>
                      <Button size="sm" variant="outline" className="border-primary text-primary">
                        Book
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="shadow-card border-2 border-dashed border-primary">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-semibold text-primary mb-2">
                AI Training Assistant
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant guidance with our AI-powered personal trainer
              </p>
              <Button className="bg-energy-gradient">
                Chat with AI Trainer
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default TrainerNetwork;