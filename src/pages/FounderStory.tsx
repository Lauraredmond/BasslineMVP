import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Heart, Zap } from "lucide-react";

const FounderStory = () => {
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
            Founder Story
          </h1>
          <p className="text-sm text-cream/80">
            The journey behind Bassline
          </p>
        </div>

        {/* Story Content */}
        <div className="space-y-6">
          <div className="bg-card-texture rounded-xl p-6 shadow-glow animate-fade-in hover-scale relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Sparkles className="w-4 h-4 text-energy-gradient animate-pulse" />
            </div>
            <p className="text-foreground/80 leading-relaxed mb-4">
              I created this 1-2-3 step fitness app to help people discover accessibility, variety, and consistency in fitness. By combining human support, diverse exercise formats, and music as a core motivator, the platform is built to make fitness more enjoyable — and ultimately, more sustainable.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              I have known too many who've discovered powerfully rewarding exercise regimes which they could have known earlier. Similarly, I've encountered really keen exercisers who dropped off through life's invariably competing demands. I'm passionate about creating tools to fix these problems. Here is my story…
            </p>
          </div>

          <div className="bg-card-texture rounded-xl p-6 shadow-glow animate-fade-in hover-scale relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Heart className="w-4 h-4 text-energy-gradient animate-pulse" />
            </div>
            <p className="text-foreground/80 leading-relaxed mb-4">
              When I was in school, I used to feel incredibly nervous on physical education (PE) days. Everyone in my class was super sporty — but I just wasn't. It wasn't something I could laugh off either. It was excruciatingly embarrassing for me, and I dreaded those days. Because sports were the only fitness channel offered in school, I gave up on all forms of exercise as soon as I left at 18.
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4 relative">
              Cut to age 19, when I had a rude awakening — I realised my fitness was starting to dwindle. I decided to do the unthinkable and join an institution I felt I had no business being in: 
              <span className="relative inline-block mx-1">
                <span className="bg-energy-gradient bg-clip-text text-transparent font-semibold">I signed up for the college gym and tried a cardio class.</span>
                <div className="absolute -top-1 -right-1">
                  <Zap className="w-3 h-3 text-energy-gradient animate-pulse" />
                </div>
              </span>
            </p>
            <p className="text-foreground/80 leading-relaxed mb-4">
              Over the weeks that followed, I fell in love with the fitness formats the gym had to offer. That brave step I took at 19 changed my life and laid the path for a lifelong love affair with exercise. I only wish I had discovered alternative methods earlier.
            </p>
            <p className="text-foreground/80 leading-relaxed">
              It's for that reason I want to help others experience the transformative effects of movement — and discover that there's more than one way to fall in love with fitness.
            </p>
          </div>

          <div className="bg-card-texture rounded-xl p-6 shadow-glow animate-fade-in hover-scale">
            <h3 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-energy-gradient" />
              A quick timeline of how fitness became fun — and accessible
            </h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 animate-scale-in">
                <div className="w-3 h-3 rounded-full bg-energy-gradient mt-2 animate-pulse"></div>
                <p className="text-foreground/80 leading-relaxed">
                  <strong>1968</strong> – Dr. Kenneth H. Cooper introduces aerobics to the world, shifting fitness from punishment to prevention.
                </p>
              </div>
              <div className="flex items-start space-x-3 animate-scale-in">
                <div className="w-3 h-3 rounded-full bg-energy-gradient mt-2 animate-pulse"></div>
                <p className="text-foreground/80 leading-relaxed">
                  <strong>1970s–80s</strong> – Dance workouts, jogging culture, and group fitness explode — exercise becomes social and joyful.
                </p>
              </div>
              <div className="flex items-start space-x-3 animate-scale-in">
                <div className="w-3 h-3 rounded-full bg-energy-gradient mt-2 animate-pulse"></div>
                <p className="text-foreground/80 leading-relaxed">
                  <strong>1990s–2000s</strong> – The rise of fitness DVDs, YouTube trainers, and boutique gyms makes fitness more personal and varied.
                </p>
              </div>
              <div className="flex items-start space-x-3 animate-scale-in">
                <div className="w-3 h-3 rounded-full bg-energy-gradient mt-2 animate-pulse"></div>
                <p className="text-foreground/80 leading-relaxed">
                  <strong>Today</strong> – Apps like Bassline take it further — turning music and movement into an addictive ritual that anyone can enjoy.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card-texture rounded-xl p-6 shadow-glow animate-fade-in hover-scale relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Heart className="w-4 h-4 text-energy-gradient animate-pulse" />
            </div>
            <div className="absolute inset-0 bg-energy-gradient/5 opacity-50"></div>
            <div className="relative z-10">
              <p className="text-foreground/80 leading-relaxed">
                Bassline isn't just powered by playlists — it's powered by people who understand the psychology of fitness. Our network of personal trainers isn't just skilled in movement — they're trained to support motivation, build confidence, and help people overcome the emotional blocks that traditional fitness often ignores.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default FounderStory;