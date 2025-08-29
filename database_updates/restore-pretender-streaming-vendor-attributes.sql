-- Restore "The Pretender" by Foo Fighters to streaming_vendor_attributes table
-- Includes spotify_tempo of 173 BPM from RapidAPI data
-- Generated from CSV extract: Supabase Snippet Streaming Vendor Attributes-2.csv

DELETE FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender' AND artist_name = 'Foo Fighters';

INSERT INTO streaming_vendor_attributes (
    id,
    track_name,
    artist_name,
    timestamp_ms,
    event_type,
    section_type,
    section_number,
    bar_number,
    beat_number,
    estimated_tempo,
    energy_level,
    intensity_level,
    data_source,
    capture_session_id,
    notes,
    captured_by,
    created_at,
    updated_at,
    track_duration_ms,
    spotify_track_id,
    spotify_tempo
) VALUES 
('e5ca8730-ecd3-4c7f-98b4-d4020f3657b6', 'The Pretender', 'Foo Fighters', 0, 'section_change', 'intro', 1, null, null, null, 56, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('1a52dd26-910e-493e-b486-992555dc5850', 'The Pretender', 'Foo Fighters', 32000, 'section_change', 'verse', 2, null, null, null, 60, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('5e409242-9dd2-4069-93a4-37206680ca67', 'The Pretender', 'Foo Fighters', 70000, 'section_change', 'pre-chorus', 3, null, null, null, 70, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('9d322240-e4a4-4a00-8ada-811293630a83', 'The Pretender', 'Foo Fighters', 83000, 'section_change', 'chorus', 4, null, null, null, 80, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('d955a105-49f9-4197-8191-384d1bfec2c3', 'The Pretender', 'Foo Fighters', 105000, 'section_change', 'verse', 5, null, null, null, 60, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('6f366537-3fb4-4766-a0ed-84f043dd4358', 'The Pretender', 'Foo Fighters', 120000, 'section_change', 'pre-chorus', 6, null, null, null, 70, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('2ccad55f-6a5d-4302-8b6e-4325f248824e', 'The Pretender', 'Foo Fighters', 133000, 'section_change', 'chorus', 7, null, null, null, 70, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('d15b5edd-30ae-4544-8c14-be03334f63d9', 'The Pretender', 'Foo Fighters', 157000, 'section_change', 'bridge', 8, null, null, null, 70, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('508bc326-9e29-4dec-88e8-0852aa9e4e39', 'The Pretender', 'Foo Fighters', 197000, 'section_change', 'breakdown', 9, null, null, null, 50, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.861+00', '2025-08-28 22:44:08.861+00', 254500, null, 173),
('4321abca-ed7c-45bd-bfb9-8ac8d0bd1bed', 'The Pretender', 'Foo Fighters', 207000, 'section_change', 'chorus', 10, null, null, null, 79, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.862+00', '2025-08-28 22:44:08.862+00', 254500, null, 173),
('ff53e694-a22b-4fef-8cdd-e6a516a04a13', 'The Pretender', 'Foo Fighters', 254500, 'section_change', 'outro', 11, null, null, null, 85, 50, 'manual_capture', '198df7f3-4ecc-4422-895b-1bd6900b4b41', null, 'manual_audio_capture', '2025-08-28 22:44:08.862+00', '2025-08-28 22:44:08.862+00', 254500, null, 173);

-- Verify the data was inserted correctly
SELECT track_name, artist_name, section_type, spotify_tempo, timestamp_ms 
FROM streaming_vendor_attributes 
WHERE track_name = 'The Pretender' AND artist_name = 'Foo Fighters'
ORDER BY timestamp_ms;