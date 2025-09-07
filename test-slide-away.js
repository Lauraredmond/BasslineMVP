import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;  
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSlideAway() {
  console.log('🔍 Testing Slide Away BPM mapping...');
  
  // First, let's see what tracks exist in the database
  console.log('🔍 Checking all tracks in streaming_vendor_attributes...');
  
  const { data: allTracks, error: allError } = await supabase
    .from('streaming_vendor_attributes')
    .select('track_name, artist_name, spotify_tempo')
    .is('section_type', null)
    .not('spotify_tempo', 'is', null)
    .limit(10);
    
  console.log('📊 Total tracks found:', allTracks?.length || 0);
  if (allTracks && allTracks.length > 0) {
    console.log('📍 Sample tracks:');
    allTracks.forEach((track, i) => {
      console.log(`  ${i+1}. "${track.track_name}" by ${track.artist_name} (${track.spotify_tempo} BPM)`);
    });
  }
  
  // Now check if Slide Away exists
  console.log('\\n🔍 Searching for Slide Away...');
  
  const { data: svaData, error: svaError } = await supabase
    .from('streaming_vendor_attributes')
    .select('track_name, artist_name, spotify_tempo')
    .ilike('track_name', '%slide%')
    .is('section_type', null)
    .not('spotify_tempo', 'is', null);
    
  console.log('📊 Found Slide tracks:', svaData?.length || 0);
  if (svaData && svaData.length > 0) {
    svaData.forEach(track => {
      console.log(`📍 "${track.track_name}" by ${track.artist_name} (${track.spotify_tempo} BPM)`);
    });
  }

  if (svaError) {
    console.log('❌ Error fetching Slide Away:', svaError.message);
    return;
  }

  // For testing purposes, let's create a mock Slide Away with BPM=100
  let slideAway;
  if (svaData && svaData.length > 0) {
    slideAway = svaData[0];
    console.log('📊 Using actual Slide Away BPM:', slideAway.spotify_tempo);
  } else {
    slideAway = { 
      track_name: 'Slide Away', 
      artist_name: 'Oasis', 
      spotify_tempo: 100 
    };
    console.log('📊 Using mock Slide Away BPM:', slideAway.spotify_tempo, '(for testing)');
  }

  // Get workout phases
  const { data: phases, error: phaseError } = await supabase
    .from('workout_phases')
    .select('workout_track, target_tempo_min, target_tempo_max')
    .order('target_tempo_min');

  if (phaseError) {
    console.log('❌ Error fetching workout phases:', phaseError.message);
    return;
  }

  console.log('🏃 Available workout phases:');
  phases.forEach(phase => {
    const isMatch = slideAway.spotify_tempo >= phase.target_tempo_min && 
                   slideAway.spotify_tempo <= phase.target_tempo_max;
    const status = isMatch ? '✅ MATCH' : '❌ NO MATCH';
    console.log(`  ${phase.workout_track}: ${phase.target_tempo_min}-${phase.target_tempo_max} BPM ${status}`);
  });
  
  // Find the matching phase
  const matchingPhases = phases.filter(phase => 
    slideAway.spotify_tempo >= phase.target_tempo_min && 
    slideAway.spotify_tempo <= phase.target_tempo_max
  );
  
  if (matchingPhases.length > 0) {
    const bestPhase = matchingPhases.reduce((best, current) => {
      const bestRange = best.target_tempo_max - best.target_tempo_min;
      const currentRange = current.target_tempo_max - current.target_tempo_min;
      return currentRange < bestRange ? current : best;
    });
    
    console.log(`🎯 Best match: ${bestPhase.workout_track} (${bestPhase.target_tempo_min}-${bestPhase.target_tempo_max})`);
    
    if (slideAway.spotify_tempo === 100 && bestPhase.workout_track !== 'climb') {
      console.log('⚠️ PROBLEM: Slide Away (BPM=100) should map to climb phase!');
    } else if (slideAway.spotify_tempo === 100 && bestPhase.workout_track === 'climb') {
      console.log('✅ CORRECT: Slide Away (BPM=100) correctly maps to climb phase');
    }
  } else {
    console.log('❌ NO MATCHING PHASES FOUND');
  }
}

testSlideAway().catch(console.error);