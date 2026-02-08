-- 验证所有新表是否创建成功
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    'word_families',
    'user_word_family_progress',
    'user_collocation_progress',
    'user_grammar_progress'
)
ORDER BY table_name;
