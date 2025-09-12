-- FIX: Add missing INSERT/UPDATE policies for streaming_vendor_attributes table
-- This fixes the 42501 RLS policy violation error when updating BPM data

-- Allow authenticated users to insert track data (for BPM capture)
DROP POLICY IF EXISTS "streaming_vendor_attributes_insert" ON streaming_vendor_attributes;
CREATE POLICY "streaming_vendor_attributes_insert" ON streaming_vendor_attributes
    FOR INSERT TO authenticated
    USING (true);

-- Allow authenticated users to update track data (for BPM updates)  
DROP POLICY IF EXISTS "streaming_vendor_attributes_update" ON streaming_vendor_attributes;
CREATE POLICY "streaming_vendor_attributes_update" ON streaming_vendor_attributes
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Verification query to check policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'streaming_vendor_attributes'
ORDER BY policyname;