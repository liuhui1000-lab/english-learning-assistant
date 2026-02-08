/**
 * 统一文件解析工具
 * 支持多种文件格式的文本提取：
 * - 纯文本：.txt, .md, .json, .csv
 * - Word文档：.docx
 * - PDF文档：.pdf
 */

import mammoth from 'mammoth';

// 动态导入 pdf-parse 以避免类型错误
let pdf: any;
try {
  pdf = require('pdf-parse');
} catch (e) {
  console.warn('pdf-parse not available');
}

export interface ParseResult {
  text: string;
  format: 'text' | 'docx' | 'pdf';
  warnings: string[];
}

/**
 * 解析文件并提取文本内容
 */
export async function parseFile(file: File): Promise<ParseResult> {
  if (!file || !file.name) {
    throw new Error('文件对象无效');
  }

  const fileName = file.name;
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  const warnings: string[] = [];

  console.log(`[parseFile] 文件名: ${fileName}, 扩展名: ${fileExt}, 文件大小: ${file.size} bytes, MIME类型: ${file.type}`);

  let text = '';
  let format: 'text' | 'docx' | 'pdf' = 'text';

  try {
    console.log(`[parseFile] 开始解析文件: ${file.name}, 扩展名: ${fileExt}, 大小: ${file.size} bytes`);

    switch (fileExt) {
      case 'docx':
        // 使用 mammoth 解析 docx 文件
        console.log('[parseFile] 使用 mammoth 解析 docx 文件');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const docxResult = await mammoth.extractRawText({ buffer });
        text = docxResult.value;
        format = 'docx';

        if (docxResult.messages.length > 0) {
          warnings.push(
            ...docxResult.messages.map(m => `${m.type}: ${m.message}`)
          );
        }
        console.log(`[parseFile] docx 解析完成，文本长度: ${text.length}`);
        break;

      case 'pdf':
        // 使用 pdf-parse 解析 pdf 文件
        console.log('[parseFile] 使用 pdf-parse 解析 pdf 文件');
        if (!pdf) {
          throw new Error('pdf-parse 模块未加载');
        }
        const pdfBuffer = Buffer.from(await file.arrayBuffer());
        // @ts-ignore
        const pdfResult = await pdf(pdfBuffer);
        text = pdfResult.text;
        format = 'pdf';
        console.log(`[parseFile] pdf 解析完成，文本长度: ${text.length}`);
        break;

      case 'txt':
      case 'md':
      case 'json':
      case 'csv':
        // 纯文本文件
        console.log(`[parseFile] 读取纯文本文件: ${fileExt}`);
        text = await file.text();
        format = 'text';
        console.log(`[parseFile] 纯文本文件读取完成，文本长度: ${text.length}`);
        break;

      default:
        throw new Error(
          `不支持的文件格式: ${fileExt} (文件名: ${fileName})。支持的格式: ${getSupportedFormats().join(', ')}`
        );
    }

    if (!text.trim()) {
      throw new Error('文件内容为空');
    }

    return { text, format, warnings };
  } catch (error) {
    console.error('文件解析失败:', error);
    throw new Error(
      error instanceof Error ? error.message : '文件解析失败'
    );
  }
}

/**
 * 获取支持的文件格式列表
 */
export function getSupportedFormats(): string[] {
  return ['txt', 'md', 'json', 'csv', 'docx', 'pdf'];
}

/**
 * 验证文件格式是否支持
 */
export function isFormatSupported(fileName: string): boolean {
  const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
  return getSupportedFormats().includes(fileExt);
}
