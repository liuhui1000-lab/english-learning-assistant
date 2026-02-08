/**
 * 统一文件解析工具
 * 支持多种文件格式的文本提取：
 * - 纯文本：.txt, .md, .json, .csv
 * - Word文档：.docx
 * - PDF文档：.pdf
 */

import mammoth from 'mammoth';

export interface ParseResult {
  text: string;
  format: 'text' | 'docx' | 'pdf';
  warnings: string[];
}

/**
 * 解析 PDF 文件
 */
async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    console.log('[parsePDF] 开始加载 pdf-parse 模块');
    // 使用动态导入
    const pdfModule = await import('pdf-parse');
    console.log('[parsePDF] pdf-parse 模块加载成功');

    // pdf-parse 可能同时有 default 和命名导出
    const pdf = (pdfModule as any).default || pdfModule;
    console.log('[parsePDF] 开始解析 PDF，buffer 大小:', buffer.length);

    const pdfResult = await pdf(buffer);
    console.log('[parsePDF] PDF 解析完成，文本长度:', pdfResult.text?.length || 0);

    return pdfResult.text;
  } catch (error) {
    console.error('[parsePDF] 解析失败:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';
    console.error('[parsePDF] 错误详情:', errorMessage);

    // 如果是 Netlify 环境，可能是 pdf-parse 加载失败
    if (errorMessage.includes('Cannot find module') || errorMessage.includes('module not found')) {
      throw new Error(
        'PDF 解析模块加载失败。Netlify 环境可能不支持 PDF 解析。建议将 PDF 转换为 DOCX 或 TXT 格式后再上传。'
      );
    }

    throw new Error(
      `PDF 解析失败: ${errorMessage}。请确保文件格式正确，或转换为 DOCX/TXT 格式后重试。`
    );
  }
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
        const pdfBuffer = Buffer.from(await file.arrayBuffer());
        text = await parsePDF(pdfBuffer);
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
