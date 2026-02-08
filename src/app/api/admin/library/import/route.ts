/**
 * 题库导入API
 * POST   /api/admin/library/import - 导入题库文件
 * GET    /api/admin/library/import/tasks - 获取导入任务列表
 * GET    /api/admin/library/import/tasks/:id - 获取导入任务详情
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/utils/db';
import { checkPermission } from '@/utils/auth';
import { parseFile, getSupportedFormats } from '@/utils/fileParser';

/**
 * POST /api/admin/library/import - 导入题库文件
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const libraryType = formData.get('libraryType') as string || 'word';
    const version = formData.get('version') as string || 'v1.0';
    const description = formData.get('description') as string;

    // 验证必填字段
    if (!file) {
      return NextResponse.json(
        { error: '请选择文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const supportedFormats = ['json', 'csv', 'txt', 'md', 'docx', 'pdf'];

    if (!supportedFormats.includes(fileExt || '')) {
      return NextResponse.json(
        { error: `仅支持 ${supportedFormats.join(', ').toUpperCase()} 格式文件` },
        { status: 400 }
      );
    }

    // 解析文件内容
    let text = '';

    try {
      const parseResult = await parseFile(file);
      text = parseResult.text;

      if (parseResult.warnings.length > 0) {
        console.warn('[题库导入] 解析警告:', parseResult.warnings);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '文件解析失败' },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: '文件内容为空' },
        { status: 400 }
      );
    }

    // 解析文件内容
    let items: any[] = [];

    // 如果是 JSON 或 CSV，使用现有逻辑
    if (fileExt === 'json') {
      try {
        const jsonData = JSON.parse(text);
        items = Array.isArray(jsonData) ? jsonData : (jsonData.items || []);
      } catch (error) {
        return NextResponse.json(
          { error: 'JSON 文件格式错误' },
          { status: 400 }
        );
      }
    } else if (fileExt === 'csv') {
      items = parseCSV(text);
    } else {
      // 对于其他格式（txt, md, docx, pdf），使用 AI 智能解析
      try {
        const aiResult = await fetch('/api/admin/ai/parse-words', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text,
            includeExamples: true
          }),
        });

        if (aiResult.ok) {
          const aiData = await aiResult.json();
          if (aiData.success && aiData.data && aiData.data.words) {
            // 将 AI 解析的单词转换为标准格式
            items = aiData.data.words.map((w: any) => ({
              word: w.word,
              meaning: w.definition,
              phonetic: w.pronunciation,
              partOfSpeech: w.partOfSpeech,
              example: w.example,
              exampleTranslation: w.exampleTranslation,
            }));
            console.log('[题库导入] AI 解析成功，解析到', items.length, '个单词');
          }
        }
      } catch (error) {
        console.error('[题库导入] AI 解析失败:', error);
        return NextResponse.json(
          {
            error: '文件解析失败',
            details: error instanceof Error ? error.message : '未知错误',
            suggestions: [
              '请确保文件内容包含有效的单词数据',
              '请确保 AI 提供商已正确配置',
              '请检查网络连接是否正常'
            ]
          },
          { status: 400 }
        );
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: '文件中没有找到有效数据' },
        { status: 400 }
      );
    }

    // 创建导入任务
    const taskResult = await query(
      `INSERT INTO import_tasks (library_type, file_name, file_size, file_format, status, created_by)
       VALUES ($1, $2, $3, $4, 'processing', $5)
       RETURNING id`,
      [libraryType, file.name, file.size, fileExt, permission.userId]
    );

    const taskId = taskResult.rows[0].id;

    // 异步处理导入
    if (!permission.userId) {
      return NextResponse.json(
        { error: '用户ID未找到' },
        { status: 401 }
      );
    }
    processImport(taskId, libraryType, version, description, items, permission.userId);

    return NextResponse.json({
      success: true,
      data: {
        taskId,
        libraryType,
        fileName: file.name,
        itemCount: items.length,
      },
      message: '导入任务已创建，正在处理中...',
    });
  } catch (error) {
    console.error('导入题库失败:', error);
    return NextResponse.json(
      { error: '导入题库失败' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/library/import/tasks - 获取导入任务列表
 */
export async function GET_tasks(request: NextRequest) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const libraryType = searchParams.get('libraryType');
    const status = searchParams.get('status');

    // 构建查询条件
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (libraryType) {
      whereConditions.push(`library_type = $${paramIndex}`);
      params.push(libraryType);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // 查询导入任务列表
    const result = await query(
      `SELECT * FROM import_task_list
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('获取导入任务列表失败:', error);
    return NextResponse.json(
      { error: '获取导入任务列表失败' },
      { status: 500 }
    );
  }
}

/**
 * 解析CSV文件
 */
function parseCSV(content: string): any[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const items: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const item: any = {};
      headers.forEach((header, index) => {
        item[header.trim()] = values[index]?.trim();
      });
      items.push(item);
    }
  }

  return items;
}

/**
 * 解析CSV行
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * 异步处理导入
 */
async function processImport(
  taskId: number,
  libraryType: string,
  version: string,
  description: string,
  items: any[],
  userId: string
) {
  try {
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // 创建或查找版本
    let versionResult = await query(
      'SELECT id FROM library_versions WHERE library_type = $1 AND version = $2',
      [libraryType, version]
    );

    let versionId: number;
    if (versionResult.rows.length === 0) {
      versionResult = await query(
        `INSERT INTO library_versions (library_type, version, description, created_by, is_active)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id`,
        [libraryType, version, description, userId]
      );
      versionId = versionResult.rows[0].id;
    } else {
      versionId = versionResult.rows[0].id;
    }

    // 批量插入数据
    for (const item of items) {
      try {
        switch (libraryType) {
          case 'word':
            await query(
              `INSERT INTO words (word, meaning, phonetic, example, category, difficulty, version_id, created_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                item.word || item.Word || item['单词'],
                item.meaning || item.Meaning || item['意思'],
                item.phonetic || item.Phonetic || item['音标'] || '',
                item.example || item.Example || item['例句'] || '',
                item.category || item.Category || item['分类'] || 'general',
                item.difficulty || item.Difficulty || item['难度'] || 'intermediate',
                versionId,
                userId
              ]
            );
            successCount++;
            break;
          // 其他题库类型...
          default:
            failedCount++;
            errors.push(`不支持的题库类型: ${libraryType}`);
        }
      } catch (error: any) {
        failedCount++;
        errors.push(`${item.word || item.id}: ${error.message}`);
      }
    }

    // 更新导入任务状态
    await query(
      `UPDATE import_tasks
       SET status = 'success',
           total_items = $1,
           success_items = $2,
           failed_items = $3,
           changes = jsonb_build_object(
             'added', $2,
             'failed', $3,
             'errors', $4
           ),
           completed_at = NOW()
       WHERE id = $5`,
      [items.length, successCount, failedCount, JSON.stringify(errors.slice(0, 10)), taskId]
    );

    // 记录版本变更
    await query('SELECT record_version_changes($1, $2)', [libraryType, version]);

  } catch (error: any) {
    console.error('导入处理失败:', error);
    
    // 更新导入任务状态为失败
    await query(
      `UPDATE import_tasks
       SET status = 'failed',
           error_message = $1,
           completed_at = NOW()
       WHERE id = $2`,
      [error.message, taskId]
    );
  }
}

/**
 * GET /api/admin/library/import/tasks/:id - 获取导入任务详情
 */
export async function GET_task_detail(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 验证管理员权限
    const permission = await checkPermission('admin');
    if (!permission.success) {
      return NextResponse.json(
        { error: permission.error },
        { status: 401 }
      );
    }

    const taskId = context.params.id;

    // 查询任务详情
    const result = await query(
      'SELECT * FROM import_task_list WHERE id = $1',
      [taskId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: '任务不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('获取导入任务详情失败:', error);
    return NextResponse.json(
      { error: '获取导入任务详情失败' },
      { status: 500 }
    );
  }
}
