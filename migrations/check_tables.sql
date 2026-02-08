-- 查看数据库中所有的表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name NOT LIKE 'pg_%'
ORDER BY table_name;
