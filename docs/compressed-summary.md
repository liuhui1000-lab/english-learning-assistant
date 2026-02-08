# 压缩摘要

## 用户需求与目标
- 当前目标: 实现词族学习系统（Word Family），将单词和词性转换整合为词族单位进行学习，支持艾宾浩斯记忆曲线。
- 数据导入需求: 管理员提供两种资料：1.按年级和学期分开的单词表（6-9年级，每个年级分上学期和下学期，共8份）；2.网上整理的初中词转表（贯穿初中，包含所有中考词转知识）。程序需基于词转表生成词族，并关联单词表中的数据。
- **向下兼容需求**: 8年级下学期的学生应能看到6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期的单词和词转内容，高年级学生可以学习当前年级学期内容，同时复习所有之前年级学期的内容。
- **无版本区分**: 所有上传的资料都没有版本的区分，不添加版本管理功能。

## 项目概览
- 概述: 基于 Next.js 的全栈英语学习助手，专为上海初二学生设计。包含单词、语法、阅读三大核心模块，支持 AI 智能错题分析。新增多用户角色管理系统、题库版本管理系统、API 配额监控功能、多 AI 服务配置系统、模拟卷智能上传、错题自动分类及基于角色的 Dashboard。
- 技术栈:
  - Next.js 16 (App Router)
  - React 19
  - TypeScript 5
  - Tailwind CSS 4
  - shadcn/ui (Radix UI)
  - PostgreSQL (Drizzle ORM)
  - 多 AI 服务 (Gemini 2.5 Flash, DeepSeek, Kimi, OpenAI, MiniMax, Claude)
  - Netlify (部署)
  - Neon (数据库)

## 关键决策
- 采用 Netlify + Neon 部署方案，完全免费。
- 使用多 AI 服务策略，支持 Gemini、DeepSeek、Kimi、OpenAI、MiniMax、Claude。
- 实现多用户角色系统（admin/user），数据完全隔离。
- 实现题库版本管理，支持批量导入、激活、回滚。
- 优化 AI 调用策略：分批上传 + 手动触发 + 合并调用，节省 95% 成本。
- 实现 API 配额监控，额度用完时提示重试时间。
- 创建统一导航栏，显示用户登录状态和信息。
- 实现模拟卷智能上传，支持混合题型自动识别和分配。
- 实现错题上传自动分类，根据题型保存到不同数据库表。
- 创建 Dashboard 页面，根据用户角色显示不同功能模块。
- **新增**：采用词族（Word Family）学习模式，将单词和词转整合，提升记忆效率。
- **新增**：实现学习内容向下兼容系统，高年级学生可复习低年级内容。
- **新增**：支持年级学期分层，每个年级分为上学期和下学期。
- **数据策略**：单词表严格按年级和学期（6-9年级，每个年级分上学期和下学期，共8份）；词转、搭配、语法表贯穿初中，不按年级学期隔离。
- **词族生成**：基于词转表（主要数据源）生成词族，关联单词表数据，根据用户年级学期推荐。
- **向下兼容**：支持学期向下兼容，如8年级下学期可访问6年级上学期到8年级下学期的所有内容。
- **版本策略**：不添加版本管理功能，所有资料无版本区分。

## 核心文件修改

### 文件创建（词族系统）
- `src/storage/database/shared/schema.ts` (添加词族表及相关进度表)
- `migrations/step1_create_tables.sql` (创建词族相关表)
- `migrations/step2_create_missing_tables.sql` (创建缺失表)
- `migrations/step3_add_grade_fields_simple.sql` (添加年级字段)
- `migrations/step4_add_semester_fields.sql` (添加学期字段)
- `src/storage/database/wordFamilyManager.ts` (词族管理核心)
- `src/storage/database/wordFamilyGenerator.ts` (词族生成器)
- `src/utils/wordFamilyRecognizer.ts` (词族识别器)

### 文件创建（向下兼容系统）
- `src/storage/database/learningContentAdapter.ts` (学习内容适配器，核心向下兼容逻辑，支持学期)
- `src/app/api/learning/content/route.ts` (获取学习内容 API，支持学期)
- `src/app/api/learning/stats/route.ts` (获取学习统计 API，支持学期)
- `src/app/api/learning/plan/route.ts` (生成学习计划 API，支持学期)
- `src/app/api/learning/test-compatibility/route.ts` (测试向下兼容 API，支持学期)

### 文件创建（管理功能）
- `src/app/api/admin/word-families/route.ts` (词族查询)
- `src/app/api/admin/word-families/[id]/route.ts` (词族详情)
- `src/app/api/admin/word-families/[id]/words/route.ts` (关联单词)
- `src/app/api/admin/word-families/[id]/transformations/route.ts` (关联词转)
- `src/app/api/admin/word-families/initialize/route.ts` (初始化词转表)
- `src/app/api/admin/word-families/recognize/route.ts` (识别词族)
- `src/app/api/admin/word-families/generate/route.ts` (生成词族)
- `src/app/api/admin/words/import/route.ts` (导入单词，支持学期)
- `src/app/api/admin/words/complete/route.ts` (补全单词数据)

### 文件创建（文档）
- `docs/word-family-grade-design.md` (年级处理方案)
- `docs/learning-content-downward-compatibility.md` (向下兼容设计)
- `docs/data-import-guide.md` (数据导入指南)
- `docs/quick-start.md` (快速开始)
- `docs/table-design-explanation.md` (表设计说明)
- `docs/word-family-generation-guide.md` (词族生成指南)
- `docs/word-family-quick-start.md` (词族系统快速开始)
- `docs/word-family-semester-design.md` (年级学期支持设计文档)
- `docs/compressed-summary.md` (压缩摘要)

### 文件创建（示例）
- `data/sample-words.json` (示例单词数据)

### 文件创建（测试）
- `src/storage/database/test-downward-compatibility.ts` (向下兼容逻辑测试脚本，支持学期)
- `src/storage/database/TEST-DOWNWARD-COMPATIBILITY.md` (测试说明文档)

### 文件修改
- `src/app/api/admin/exam/upload/route.ts` (修复类型错误，添加年级选择)
- `src/app/api/grammar/exercises/import/route.ts` (修复 level 字段类型)
- `src/app/api/mistakes/upload/route.ts` (修复 level 字段类型)
- `src/storage/database/grammarManager.ts` (修复 level 参数类型)
- `src/utils/authHelper.ts` (添加 verifyAdmin 函数)

## 关键修改

### 数据库结构设计
- **words 表**：添加 `grade` 字段（严格按年级）、`semester` 字段（上学期/下学期）
- **word_families 表**：添加 `grade` 字段（主要年级）、`semester` 字段（主要学期）
- **user_word_family_progress 表**：追踪词族学习进度（支持艾宾浩斯记忆曲线）
- **word_transformations 表**：不添加 `grade` 和 `semester` 字段（贯穿初中）
- **collocations 表**：不添加 `grade` 和 `semester` 字段（贯穿初中）

### 词族系统核心
- **WordFamilyManager**：管理词族、单词、词转、搭配的关联
- **WordFamilyGenerator**：基于词转表生成词族
- **WordFamilyRecognizer**：智能识别词族

### 向下兼容系统核心
- **学习内容适配器（Learning Content Adapter）**：核心模块
  - `parseGradeSemester(gradeSemester)`：解析年级学期组合
  - `combineGradeSemester(grade, semester)`：组合年级和学期
  - `getAccessibleGradeSemesters(userGradeSemester)`：获取用户可访问的年级学期列表
  - `adaptWordFamiliesForUser(userGradeSemester, limit)`：为用户适配词族（向下兼容，支持学期）
  - `getUserLearningStats(userId, userGradeSemester)`：获取学习统计
  - `generateLearningPlan(userGradeSemester)`：生成学习计划
- **年级学期映射**：
  ```typescript
  GRADE_SEMESTER_COMPATIBILITY = {
    '6年级上学期': ['6年级上学期'],
    '6年级下学期': ['6年级上学期', '6年级下学期'],
    '7年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期'],
    '7年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期'],
    '8年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期'],
    '8年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期'],
    '9年级上学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期'],
    '9年级下学期': ['6年级上学期', '6年级下学期', '7年级上学期', '7年级下学期', '8年级上学期', '8年级下学期', '9年级上学期', '9年级下学期'],
  }
  ```

### 数据导入流程
- 单词批量导入（按年级和学期）
- 词族智能初始化（基于词转表）
- 单词数据自动补全（使用 LLM）

### 年级策略优化
- 确认单词表严格按年级和学期（6-9年级，每个年级分上学期和下学期，共8份）
- 词转/搭配/语法表贯穿初中（不按年级学期隔离）
- 实现向下兼容：高年级可复习低年级内容，支持学期分层
- 符合中考知识体系

### 迁移策略
- Step1：创建4个新表（word_families、user_word_family_progress、word_transformations、collocations）
- Step2：创建4个缺失的表（修复 Netlify 迁移）
- Step3：添加年级字段（words、word_families）
- Step4：添加学期字段（words、word_families）

## 问题或错误及解决方案
- **问题**: Netlify 数据库迁移执行失败。
  - **解决方案**: 拆分迁移脚本。Step1 创建4个新表，Step2 创建4个缺失的表，Step3 添加年级字段，Step4 添加学期字段。
- **问题**: Netlify 构建失败（TypeScript 类型错误）。
  - **解决方案**: 修复 `grammarPoints` 表 `level` 字段类型错误（多处），将数字改为字符串；添加缺失的 `verifyAdmin` 函数。
- **问题**: 用户需要向下兼容的学习内容。
  - **解决方案**: 实现学习内容适配器，高年级学生可复习低年级内容。
- **问题**: 每个年级需要分为上学期和下学期。
  - **解决方案**: 添加 `semester` 字段，更新向下兼容逻辑，支持学期分层。
- **问题**: 所有上传的资料都没有版本的区分。
  - **解决方案**: 不添加版本管理功能，所有资料无版本区分。

## TODO
- 导入词转表数据（网上整理的初中词转知识）
- 导入单词表数据（按年级和学期分开：6年级上学期、6年级下学期、7年级上学期、7年级下学期、8年级上学期、8年级下学期、9年级上学期、9年级下学期，共8份）
- 使用词族生成 API 基于词转表生成词族
- 测试词族关联和推荐功能
- 测试向下兼容逻辑（运行测试脚本）
- 测试学期支持（运行测试脚本）
- 开发词族学习前端界面
- 集成真实 LLM 服务用于单词数据补全
- 实现词族进度追踪和艾宾浩斯复习提醒

## 下一步行动

1. 运行向下兼容逻辑测试（支持学期）：
   ```bash
   npx ts-node src/storage/database/test-downward-compatibility.ts
   ```

2. 测试 API 接口：
   - `/api/learning/content` - 获取学习内容（支持学期）
   - `/api/learning/stats` - 获取学习统计（支持学期）
   - `/api/learning/plan` - 生成学习计划（支持学期）
   - `/api/learning/test-compatibility` - 测试向下兼容（管理员，支持学期）
   - `/api/admin/words/import` - 导入单词（支持学期）

3. 导入数据：
   - 导入词转表（贯穿初中）
   - 导入单词表（按年级和学期分开，共8份）
   - 生成词族

4. 开发前端界面（可选）
