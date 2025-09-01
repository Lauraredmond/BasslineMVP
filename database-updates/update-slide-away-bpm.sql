-- Update Slide Away BPM to 94 for proper climb mapping
-- Slide Away by Oasis is 94 BPM, should map to climb (80-94 BPM range)

UPDATE streaming_vendor_attributes 
SET spotify_tempo = 94.0
WHERE track_name = 'Slide Away' 
  AND artist_name = 'Oasis' 
  AND spotify_tempo IS NULL;

-- Verify the update
SELECT track_name, artist_name, spotify_tempo, COUNT(*) as record_count
FROM streaming_vendor_attributes 
WHERE track_name = 'Slide Away' AND artist_name = 'Oasis'
GROUP BY track_name, artist_name, spotify_tempo;