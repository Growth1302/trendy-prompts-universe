-- DIAGNOSTIC QUERY: Run this to inspect your existing schema before applying the migration
-- This query is READ-ONLY and will not change any data.

SELECT 
    cols.column_name, 
    cols.data_type, 
    cols.column_default, 
    cols.is_identity,
    (SELECT count(*) FROM pg_policies WHERE tablename = 'prompts' AND schemaname = 'public') as policy_count,
    (SELECT pg_get_expr(adbin, adrelid) FROM pg_attrdef WHERE adrelid = 'public.prompts'::regclass AND adnum = cols.ordinal_position) as default_value
FROM information_schema.columns cols
WHERE table_schema = 'public' 
  AND table_name = 'prompts'
ORDER BY ordinal_position;

-- Check RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('prompts', 'prompt_ownership');

-- List existing policies
SELECT policyname, tablename, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public';
