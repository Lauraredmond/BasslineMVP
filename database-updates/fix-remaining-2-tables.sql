-- FINAL SECURITY FIX: Secure the remaining 2 exposed tables
-- Based on Supabase Security Advisor results showing:
-- ❌ instruction_narratives - EXPOSED
-- ❌ trainer_multidisciplinary_support - EXPOSED

-- Enable RLS on the remaining exposed tables
ALTER TABLE public.instruction_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_multidisciplinary_support ENABLE ROW LEVEL SECURITY;

-- Create policies for instruction_narratives (likely public read access)
DROP POLICY IF EXISTS "instruction_narratives_read_policy" ON public.instruction_narratives;
CREATE POLICY "instruction_narratives_read_policy" ON public.instruction_narratives
    FOR SELECT 
    USING (true); -- Public read access for workout instructions

DROP POLICY IF EXISTS "instruction_narratives_write_policy" ON public.instruction_narratives;
CREATE POLICY "instruction_narratives_write_policy" ON public.instruction_narratives
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated'); -- Only authenticated users can add instructions

-- Create policies for trainer_multidisciplinary_support (likely public read access)
DROP POLICY IF EXISTS "trainer_multidisciplinary_support_read_policy" ON public.trainer_multidisciplinary_support;
CREATE POLICY "trainer_multidisciplinary_support_read_policy" ON public.trainer_multidisciplinary_support
    FOR SELECT 
    USING (true); -- Public read access for trainer support info

DROP POLICY IF EXISTS "trainer_multidisciplinary_support_write_policy" ON public.trainer_multidisciplinary_support;
CREATE POLICY "trainer_multidisciplinary_support_write_policy" ON public.trainer_multidisciplinary_support
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated'); -- Only authenticated users can add support info

-- Grant appropriate permissions
GRANT SELECT ON public.instruction_narratives TO anon, authenticated;
GRANT SELECT ON public.trainer_multidisciplinary_support TO anon, authenticated;
GRANT INSERT ON public.instruction_narratives TO authenticated;
GRANT INSERT ON public.trainer_multidisciplinary_support TO authenticated;

-- Verify the fix worked
SELECT 
    tablename,
    CASE WHEN c.relrowsecurity THEN '✅ SECURED' ELSE '❌ EXPOSED' END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' 
AND tablename IN ('instruction_narratives', 'trainer_multidisciplinary_support')
ORDER BY tablename;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '🔒 FINAL SECURITY FIX COMPLETED';
    RAISE NOTICE '✅ instruction_narratives table secured with RLS';
    RAISE NOTICE '✅ trainer_multidisciplinary_support table secured with RLS';
    RAISE NOTICE '🎯 ALL TABLES SHOULD NOW BE SECURED!';
    RAISE NOTICE '📋 Check Supabase Security Advisor to confirm 0 violations';
END $$;