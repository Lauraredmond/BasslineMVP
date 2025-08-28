import { AudioTimestampCapture } from '@/components/AudioTimestampCapture';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Header } from '@/components/Header';

const AudioTimestamping = () => {
  return (
    <div className="min-h-screen bg-premium-texture flex flex-col">
      <Header title="Audio Timestamping" />
      
      <div className="flex-1 px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-cream mb-4">
              Audio Timestamp Capture Tool
            </h1>
            <p className="text-lg text-cream/80 max-w-2xl mx-auto">
              Record "The Pretender" by Foo Fighters and manually capture section changes, 
              bar changes, and beats to build streaming vendor attribute data.
            </p>
          </div>
          
          <AudioTimestampCapture />
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AudioTimestamping;