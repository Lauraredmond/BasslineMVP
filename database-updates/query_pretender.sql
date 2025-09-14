SELECT track_name, artist_name, spotify_tempo, section_type, timestamp_ms FROM streaming_vendor_attributes WHERE track_name ILIKE '%pretender%' ORDER BY timestamp_ms;
