const { Client } = require('pg');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let client;

  try {
    const { trackName, artistName, sections, metadata } = JSON.parse(event.body);

    if (!trackName || !artistName || !sections || !Array.isArray(sections)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Missing required fields: trackName, artistName, sections' 
        })
      };
    }

    console.log(`💾 Storing ${sections.length} algorithmic sections for: ${trackName} by ${artistName}`);

    // Connect to database
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    await client.connect();

    // Store each section as a separate database row
    const insertedSections = [];
    
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Insert section data into vendor analysis table
      const insertQuery = `
        INSERT INTO streaming_vendor_analysis (
          track_name,
          artist_name,
          analysis_source,
          section_type,
          section_start,
          section_end,
          section_indicator,
          tempo,
          energy,
          loudness,
          confidence_score,
          intensity_level,
          workout_narrative,
          prediction_metadata,
          playback_position_ms,
          current_section_start,
          current_section_end,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
        ) RETURNING id, created_at
      `;

      const values = [
        section.track_name,
        section.artist_name,
        section.analysis_source || 'algorithmic_prediction',
        section.section_type,
        section.section_start_time,
        section.section_end_time,
        section.section_indicator,
        section.tempo,
        section.energy,
        section.loudness,
        section.confidence_score || 0.8,
        section.intensity_level || 75,
        section.workout_narrative,
        section.prediction_metadata,
        section.playback_position_ms || 0,
        section.section_start_time, // current_section_start
        section.section_end_time,   // current_section_end
      ];

      const result = await client.query(insertQuery, values);
      insertedSections.push({
        id: result.rows[0].id,
        sectionType: section.section_type,
        startTime: section.section_start_time,
        endTime: section.section_end_time,
        created_at: result.rows[0].created_at
      });

      console.log(`✅ Inserted section ${i + 1}: ${section.section_type} (${Math.round(section.section_start_time)}s-${Math.round(section.section_end_time)}s)`);
    }

    console.log(`✅ Successfully stored ${insertedSections.length} algorithmic sections in database`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Stored ${insertedSections.length} algorithmic sections`,
        trackName,
        artistName,
        sectionsStored: insertedSections.length,
        totalDuration: sections[sections.length - 1]?.section_end_time || 0,
        analysisMetadata: {
          algorithm_version: metadata?.algorithm_version || '1.0',
          prediction_confidence: metadata?.prediction_confidence || 0.8,
          total_sections: metadata?.total_sections || sections.length
        },
        insertedSections: insertedSections.slice(0, 5) // Show first 5 for verification
      })
    };

  } catch (error) {
    console.error('❌ Error storing algorithmic sections:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to store algorithmic sections',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
};