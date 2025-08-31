import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, X } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Trainer, Testimonial, getPhilosophyPreview, calculateAverageRating } from "@/types/trainer";

const TrainerNetwork = () => {
  const navigate = useNavigate();
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);

  const handleBack = () => {
    navigate(-1);
  };

  const trainers: Trainer[] = [
    {
      id: 1,
      name: "Laura Redmond",
      specialties: ["Pilates - Mat Based (Beginners only)"],
      specializedTags: ["Intro to Pilates"],
      rating: 3,
      testimonials: 0,
      image: "https://media.licdn.com/dms/image/v2/D4E03AQFbN3MTsiG-WA/profile-displayphoto-shrink_100_100/profile-displayphoto-shrink_100_100/0/1721509042695?e=1759363200&v=beta&t=fHI6KxivnUVya3aS-WuvX3xAQMFKgRnk7jYAS1dWPU0",
      bio: "NTC-certified Mat-Based trainer with trainee-level experience in mat-based Pilates instruction using Joseph Pilates' original 34 movement repertoire.",
      multidisciplinarySupport: [
        "A consistent exerciser for 20 years, who obtained a mat-based Pilates certification out of a desire to deepen her understanding of exercise"
      ],
      training_philosophy: "Exercise is a powerful support and, at times, a lifeline for people and I believe there is a format to suit everyone.",
      testimonials_data: [
        { quote: "TBC.", author: "CH-TBC", rating: 5, date: "2024-11-20" }
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
      ],
      training_philosophy: "Strength training is for everyone, regardless of age or starting point. I focus on progressive overload and functional movements that translate to real-life activities. Your body is capable of more than you think.",
      testimonials_data: [
        { quote: "Mike got me back to lifting after my knee surgery. His patience and expertise gave me my strength back.", author: "Robert K.", rating: 5, date: "2024-12-10" },
        { quote: "At 65, I never thought I could deadlift again. Mike proved me wrong and kept me safe every step of the way.", author: "Janet L.", rating: 5, date: "2024-10-25" }
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
      ],
      training_philosophy: "True wellness comes from the connection between mind, body, and breath. I guide clients to find balance through mindful movement and self-compassion, treating each session as an opportunity for growth and healing.",
      testimonials_data: [
        { quote: "Sarah taught me that fitness isn't about punishment - it's about self-care. Life-changing approach.", author: "Emma T.", rating: 5, date: "2024-12-01" },
        { quote: "The yoga sessions helped me manage chronic pain better than any medication. Sarah is incredibly knowledgeable.", author: "David H.", rating: 5, date: "2024-11-15" },
        { quote: "Lost 40 pounds and gained so much peace of mind. Sarah's holistic approach works.", author: "Maria G.", rating: 5, date: "2024-09-30" }
      ]
    }
    ,
    {
      id: 4,
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
      ],
      training_philosophy: "Movement is medicine. I believe in meeting each client where they are and building strength from the inside out. Every workout should empower you physically and mentally, creating lasting confidence that extends far beyond the gym.",
      testimonials_data: [
        { quote: "Jane helped me rebuild my confidence after postpartum depression. Her understanding of mental health made all the difference.", author: "Sarah M.", rating: 5, date: "2024-12-15" },
        { quote: "The HIIT programs are challenging but achievable. Jane knows exactly how to push you without overwhelming you.", author: "Mike R.", rating: 5, date: "2024-11-20" }
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
            <Card 
              key={trainer.id} 
              className="shadow-card border-0 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTrainer(trainer)}
            >
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
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {trainer.bio}
                    </p>

                    {/* Training Philosophy Preview */}
                    {trainer.training_philosophy && (
                      <div className="mb-3">
                        <p className="text-xs text-muted-foreground italic">
                          "{getPhilosophyPreview(trainer.training_philosophy)}"
                        </p>
                      </div>
                    )}

                    {/* Testimonials Badge */}
                    {trainer.testimonials_data && trainer.testimonials_data.length > 0 && (
                      <div className="mb-4">
                        <Badge variant="secondary" className="bg-burgundy/20 text-primary">
                          <Star className="w-3 h-3 mr-1 fill-current" />
                          {calculateAverageRating(trainer.testimonials_data)} · {trainer.testimonials_data.length}
                        </Badge>
                      </div>
                    )}

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

      {/* Trainer Detail Modal */}
      <Dialog open={!!selectedTrainer} onOpenChange={() => setSelectedTrainer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
          {selectedTrainer && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      src={selectedTrainer.image} 
                      alt={selectedTrainer.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {selectedTrainer.name}
                  <div className="flex items-center gap-1 ml-auto">
                    <Star className="w-4 h-4 text-burgundy fill-current" />
                    <span className="text-sm font-medium">{selectedTrainer.rating}</span>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Existing sections */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">About</h2>
                  <p className="text-sm text-muted-foreground">{selectedTrainer.bio}</p>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Specialties</h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedTrainer.specialties.map((specialty) => (
                      <Badge key={specialty} variant="secondary" className="bg-burgundy-light text-primary">
                        {specialty}
                      </Badge>
                    ))}
                    {selectedTrainer.specializedTags.map((tag) => (
                      <Badge key={tag} variant="outline" className="border-primary text-primary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Multidisciplinary Support</h2>
                  <ul className="space-y-2">
                    {selectedTrainer.multidisciplinarySupport.map((point, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start">
                        <span className="text-primary mr-2">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* NEW: Training Philosophy Section */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">My Training Philosophy</h2>
                  {selectedTrainer.training_philosophy ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {selectedTrainer.training_philosophy}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Trainer hasn't added a philosophy yet.
                    </p>
                  )}
                </div>

                {/* NEW: Customer Testimonials Section */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Customer Testimonials</h2>
                  {selectedTrainer.testimonials_data && selectedTrainer.testimonials_data.length > 0 ? (
                    <div className="space-y-4">
                      {selectedTrainer.testimonials_data.map((testimonial, index) => (
                        <Card key={index} className="bg-muted/50">
                          <CardContent className="p-4">
                            <p className="text-sm text-foreground mb-2 italic">
                              "{testimonial.quote}"
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {testimonial.author && (
                                  <span>— {testimonial.author}</span>
                                )}
                                {testimonial.rating && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 text-burgundy fill-current" />
                                    <span>{testimonial.rating}</span>
                                  </div>
                                )}
                              </div>
                              {testimonial.date && (
                                <span>{new Date(testimonial.date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No testimonials yet.
                    </p>
                  )}
                </div>

                {/* Existing action buttons */}
                <div className="grid grid-cols-3 gap-2 pt-4">
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
            </>
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
};

export default TrainerNetwork;