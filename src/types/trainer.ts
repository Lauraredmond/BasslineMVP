export type Testimonial = {
  quote: string;
  author?: string;
  rating?: number;
  date?: string;
};

export type Trainer = {
  id: number | string;
  name: string;
  bio: string;
  specialties: string[];
  specializedTags: string[];
  rating: number;
  testimonials: number; // Legacy: testimonial count
  image: string;
  multidisciplinarySupport: string[];
  // New fields (backward-compatible)
  training_philosophy?: string | null;
  testimonials_data?: Testimonial[] | null; // Renamed to avoid conflict with count
};

// Helper function to calculate average rating from testimonials
export const calculateAverageRating = (testimonials?: Testimonial[] | null): number => {
  if (!testimonials || testimonials.length === 0) return 0;
  const ratingsWithValues = testimonials.filter(t => t.rating !== undefined);
  if (ratingsWithValues.length === 0) return 0;
  const sum = ratingsWithValues.reduce((acc, t) => acc + (t.rating || 0), 0);
  return Math.round((sum / ratingsWithValues.length) * 10) / 10;
};

// Helper function to get philosophy preview
export const getPhilosophyPreview = (philosophy?: string | null): string => {
  if (!philosophy) return '';
  return philosophy.length > 160 ? philosophy.substring(0, 160) + '...' : philosophy;
};