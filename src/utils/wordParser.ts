/**
 * 智能单词解析器
 * 支持多种文档格式的解析：
 * 1. 完整格式：单词 + 发音 + 词性 + 词义 + 例句 + 例句翻译
 * 2. 简化格式：单词 + 词义
 * 3. 单词列表：只有单词
 */

import { fetchDictionaryWithCache } from './dictionary';

export interface ParsedWord {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  exampleTranslation: string;
}

export interface ParseResult {
  words: ParsedWord[];
  format: 'complete' | 'simple' | 'list';
}

/**
 * 解析单词文档
 * @param text - 文档文本
 * @returns 解析结果
 */
export async function parseWordDocument(
  text: string,
  options: {
    fetchPronunciation?: boolean;   // 是否获取发音
    fetchPartOfSpeech?: boolean;    // 是否获取词性
    fetchExample?: boolean;         // 是否获取例句
  } = {}
): Promise<ParsedWord[]> {
  const {
    fetchPronunciation = true,
    fetchPartOfSpeech = true,
    fetchExample = false,
  } = options;
  
  // 清理文本（去除空行、多余空格）
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const words: ParsedWord[] = [];
  
  // 尝试多种格式解析
  const parsed = tryParseCompleteFormat(lines);
  if (parsed) {
    // 完整格式，直接使用
    return parsed;
  }
  
  // 尝试简化格式（单词 + 词义）
  const simpleParsed = tryParseSimpleFormat(lines);
  if (simpleParsed) {
    // 补充发音和词性
    const enriched = await enrichWords(simpleParsed, options);
    return enriched;
  }
  
  // 尝试单词列表格式
  const listParsed = tryParseListFormat(lines);
  if (listParsed) {
    // 使用AI生成完整信息
    const enriched = await enrichWords(listParsed, {
      fetchPronunciation: true,
      fetchPartOfSpeech: true,
      fetchExample: true,
    });
    return enriched;
  }
  
  // 都失败了，尝试使用AI
  return await parseWithAI(text);
}

/**
 * 尝试解析完整格式
 * 示例：
 * adventure /ədˈventʃər/ n. 冒险
 * He went on a great adventure last summer.
 * 他去年夏天进行了一次伟大的冒险。
 */
function tryParseCompleteFormat(lines: string[]): ParsedWord[] | null {
  const words: ParsedWord[] = [];
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i];
    
    // 检查是否是单词行（包含音标和词性）
    // 格式：word /pronunciation/ partOfSpeech definition
    const wordMatch = line.match(/^([a-zA-Z]+)\s+\/([^\/]+)\/\s+([n.v.adj.adv.]+)\s+(.+)$/);
    
    if (wordMatch) {
      const [, word, pronunciation, partOfSpeech, definition] = wordMatch;
      
      let example = '';
      let exampleTranslation = '';
      
      // 检查下一行是否是例句（英文）
      if (i + 1 < lines.length && !lines[i + 1].match(/^([a-zA-Z]+)/)) {
        example = lines[i + 1];
        
        // 检查下下行是否是例句翻译（中文）
        if (i + 2 < lines.length && lines[i + 2].match(/^[\u4e00-\u9fa5]/)) {
          exampleTranslation = lines[i + 2];
          i += 3;
        } else {
          i += 2;
        }
      } else {
        i += 1;
      }
      
      words.push({
        word: word.toLowerCase(),
        pronunciation,
        partOfSpeech,
        definition,
        example,
        exampleTranslation,
      });
    } else {
      i += 1;
    }
  }
  
  return words.length > 0 ? words : null;
}

/**
 * 尝试解析简化格式
 * 示例：
 * adventure - 冒险
 * bravery: 勇气
 * courage 勇敢
 */
function tryParseSimpleFormat(lines: string[]): ParsedWord[] {
  const words: ParsedWord[] = [];
  
  for (const line of lines) {
    // 支持多种分隔符：- : 、空格
    const match = line.match(/^([a-zA-Z]+)\s*[-：:]\s*(.+)$/);
    
    if (match) {
      const [, word, definition] = match;
      words.push({
        word: word.toLowerCase(),
        pronunciation: '',
        partOfSpeech: '',
        definition,
        example: '',
        exampleTranslation: '',
      });
    }
  }
  
  return words;
}

/**
 * 尝试解析单词列表格式
 * 示例：
 * adventure
 * bravery
 * courage
 */
function tryParseListFormat(lines: string[]): ParsedWord[] {
  const words: ParsedWord[] = [];
  
  for (const line of lines) {
    // 纯单词
    const match = line.match(/^([a-zA-Z]+)$/);
    
    if (match) {
      words.push({
        word: match[1].toLowerCase(),
        pronunciation: '',
        partOfSpeech: '',
        definition: '',
        example: '',
        exampleTranslation: '',
      });
    }
  }
  
  return words;
}

/**
 * 使用字典API补充单词信息
 */
async function enrichWords(
  words: ParsedWord[],
  options: {
    fetchPronunciation?: boolean;
    fetchPartOfSpeech?: boolean;
    fetchExample?: boolean;
  }
): Promise<ParsedWord[]> {
  const {
    fetchPronunciation = true,
    fetchPartOfSpeech = true,
    fetchExample = false,
  } = options;
  
  const enriched: ParsedWord[] = [];
  
  for (const word of words) {
    // 如果单词已经有完整信息，直接使用
    if (
      word.pronunciation &&
      word.partOfSpeech &&
      (!fetchExample || word.example)
    ) {
      enriched.push(word);
      continue;
    }
    
    // 查询字典API
    const dictData = await fetchDictionaryWithCache(word.word);
    
    if (dictData) {
      // 补充发音
      if (fetchPronunciation && !word.pronunciation && dictData.pronunciation) {
        word.pronunciation = dictData.pronunciation;
      }
      
      // 补充词性
      if (fetchPartOfSpeech && !word.partOfSpeech && dictData.partOfSpeech) {
        word.partOfSpeech = dictData.partOfSpeech;
      }
      
      // 补充例句（如果用户没有提供，且要求获取例句）
      if (fetchExample && !word.example && dictData.example) {
        word.example = dictData.example;
      }
    }
    
    enriched.push(word);
  }
  
  return enriched;
}

/**
 * 使用AI解析（降级方案）
 */
async function parseWithAI(text: string): Promise<ParsedWord[]> {
  try {
    // 调用AI API
    const response = await fetch('/api/admin/ai/parse-words', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error('AI解析失败');
    }
    
    const data = await response.json();
    return data.words || [];
  } catch (error) {
    console.error('AI解析失败:', error);
    return [];
  }
}

/**
 * 检测文档格式
 */
export function detectDocumentFormat(lines: string[]): 'complete' | 'simple' | 'list' | 'unknown' {
  // 检查完整格式
  const completeCount = lines.filter(line => 
    line.match(/^([a-zA-Z]+)\s+\/([^\/]+)\/\s+([n.v.adj.adv.]+)\s+/)
  ).length;
  
  if (completeCount > 0 && completeCount >= lines.length * 0.5) {
    return 'complete';
  }
  
  // 检查简化格式（包含分隔符）
  const simpleCount = lines.filter(line => 
    line.match(/^([a-zA-Z]+)\s*[-：:]\s*([^\-：:]+)/)
  ).length;
  
  if (simpleCount > 0 && simpleCount >= lines.length * 0.5) {
    return 'simple';
  }
  
  // 检查单词列表格式
  const listCount = lines.filter(line => 
    line.match(/^([a-zA-Z]+)$/)
  ).length;
  
  if (listCount > 0 && listCount >= lines.length * 0.5) {
    return 'list';
  }
  
  return 'unknown';
}
