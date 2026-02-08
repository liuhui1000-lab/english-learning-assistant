-- 创建模拟卷和错题去重系统的新表（策略 2：来源追踪）
-- 这个迁移创建了 4 个新表：
-- 1. questions - 题目表（去重后的题目）
-- 2. exam_papers - 试卷表
-- 3. question_paper_relations - 题目-试卷关联表
-- 4. student_mistakes - 学生错题记录表

-- 创建题目表
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    question_hash VARCHAR(32) NOT NULL UNIQUE,
    question TEXT NOT NULL,
    type VARCHAR(20) NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    appearance_count INTEGER DEFAULT 1 NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS questions_question_hash_idx ON questions(question_hash);
CREATE INDEX IF NOT EXISTS questions_type_idx ON questions(type);
CREATE INDEX IF NOT EXISTS questions_difficulty_idx ON questions(difficulty);
CREATE INDEX IF NOT EXISTS questions_first_seen_at_idx ON questions(first_seen_at DESC);
CREATE INDEX IF NOT EXISTS questions_appearance_count_idx ON questions(appearance_count DESC);

-- 创建试卷表
CREATE TABLE IF NOT EXISTS exam_papers (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    version VARCHAR(50),
    grade VARCHAR(20),
    semester VARCHAR(10),
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    question_count INTEGER DEFAULT 0 NOT NULL,
    uploaded_by VARCHAR(100)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS exam_papers_name_idx ON exam_papers(name);
CREATE INDEX IF NOT EXISTS exam_papers_grade_idx ON exam_papers(grade);
CREATE INDEX IF NOT EXISTS exam_papers_semester_idx ON exam_papers(semester);
CREATE INDEX IF NOT EXISTS exam_papers_upload_time_idx ON exam_papers(upload_time DESC);

-- 创建题目-试卷关联表
CREATE TABLE IF NOT EXISTS question_paper_relations (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id VARCHAR(36) NOT NULL,
    paper_id VARCHAR(36) NOT NULL,
    question_number VARCHAR(20),
    upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT question_paper_relations_question_paper_unique UNIQUE (question_id, paper_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS question_paper_relations_question_id_idx ON question_paper_relations(question_id);
CREATE INDEX IF NOT EXISTS question_paper_relations_paper_id_idx ON question_paper_relations(paper_id);
CREATE INDEX IF NOT EXISTS question_paper_relations_upload_time_idx ON question_paper_relations(upload_time DESC);

-- 添加外键约束
ALTER TABLE question_paper_relations
ADD CONSTRAINT IF NOT EXISTS question_paper_relations_question_id_questions_id_fk
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

ALTER TABLE question_paper_relations
ADD CONSTRAINT IF NOT EXISTS question_paper_relations_paper_id_exam_papers_id_fk
FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE CASCADE;

-- 创建学生错题记录表
CREATE TABLE IF NOT EXISTS student_mistakes (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    paper_id VARCHAR(36),
    wrong_answer TEXT,
    attempt_count INTEGER DEFAULT 1 NOT NULL,
    first_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    mastered BOOLEAN DEFAULT FALSE NOT NULL,
    last_correct_at TIMESTAMP WITH TIME ZONE,
    consecutive_correct INTEGER DEFAULT 0 NOT NULL,
    notes TEXT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS student_mistakes_user_id_idx ON student_mistakes(user_id);
CREATE INDEX IF NOT EXISTS student_mistakes_question_id_idx ON student_mistakes(question_id);
CREATE INDEX IF NOT EXISTS student_mistakes_paper_id_idx ON student_mistakes(paper_id);
CREATE INDEX IF NOT EXISTS student_mistakes_mastered_idx ON student_mistakes(mastered);
CREATE INDEX IF NOT EXISTS student_mistakes_last_wrong_at_idx ON student_mistakes(last_wrong_at DESC);

-- 创建复合索引（用户+题目，用于快速查找）
CREATE INDEX IF NOT EXISTS student_mistakes_user_question_unique ON student_mistakes(user_id, question_id);

-- 添加外键约束
ALTER TABLE student_mistakes
ADD CONSTRAINT IF NOT EXISTS student_mistakes_question_id_questions_id_fk
FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE;

ALTER TABLE student_mistakes
ADD CONSTRAINT IF NOT EXISTS student_mistakes_paper_id_exam_papers_id_fk
FOREIGN KEY (paper_id) REFERENCES exam_papers(id) ON DELETE SET NULL;

-- 创建更新时间触发器（自动更新 updated_at 字段）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questions_updated_at
    BEFORE UPDATE ON questions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 验证表是否创建成功
SELECT
    'questions' AS table_name,
    COUNT(*) AS row_count
FROM questions
UNION ALL
SELECT
    'exam_papers' AS table_name,
    COUNT(*) AS row_count
FROM exam_papers
UNION ALL
SELECT
    'question_paper_relations' AS table_name,
    COUNT(*) AS row_count
FROM question_paper_relations
UNION ALL
SELECT
    'student_mistakes' AS table_name,
    COUNT(*) AS row_count
FROM student_mistakes;

-- 显示迁移完成信息
SELECT 'Migration completed successfully!' AS status;
