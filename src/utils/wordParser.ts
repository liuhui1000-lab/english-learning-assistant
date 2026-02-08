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

  console.log('[wordParser] 开始解析单词文档，文本长度:', text.length);

  // 清理文本（去除空行、多余空格）
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  console.log('[wordParser] 清理后总行数:', lines.length);
  console.log('[wordParser] 前5行内容:', lines.slice(0, 5));

  const words: ParsedWord[] = [];

  // 尝试多种格式解析
  console.log('[wordParser] 尝试完整格式解析');
  const parsed = tryParseCompleteFormat(lines);
  if (parsed && parsed.length > 0) {
    console.log('[wordParser] 完整格式解析成功，解析到', parsed.length, '个单词');
    // 完整格式，直接使用
    return parsed;
  }

  // 尝试简化格式（单词 + 词义）
  console.log('[wordParser] 尝试简化格式解析');
  const simpleParsed = tryParseSimpleFormat(lines);
  if (simpleParsed && simpleParsed.length > 0) {
    console.log('[wordParser] 简化格式解析成功，解析到', simpleParsed.length, '个单词');
    // 补充发音和词性
    const enriched = await enrichWords(simpleParsed, options);
    return enriched;
  }

  // 尝试单词列表格式
  console.log('[wordParser] 尝试列表格式解析');
  const listParsed = tryParseListFormat(lines);
  if (listParsed && listParsed.length > 0) {
    console.log('[wordParser] 列表格式解析成功，解析到', listParsed.length, '个单词');
    // 使用AI生成完整信息
    const enriched = await enrichWords(listParsed, {
      fetchPronunciation: true,
      fetchPartOfSpeech: true,
      fetchExample: true,
    });
    return enriched;
  }

  console.log('[wordParser] 所有规则解析失败，返回空数组');
  // 都失败了，返回空数组（让调用者决定是否使用AI）
  return [];
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
 * adventure 冒险
 */
function tryParseSimpleFormat(lines: string[]): ParsedWord[] {
  const words: ParsedWord[] = [];

  console.log('[wordParser] 尝试解析简化格式，总行数:', lines.length);

  for (const line of lines) {
    console.log('[wordParser] 处理行:', line);

    // 跳过太短的行
    if (line.length < 3) {
      continue;
    }

    // 跳过纯中文行
    if (/^[\u4e00-\u9fa5\s]+$/.test(line)) {
      console.log('[wordParser] 跳过纯中文行');
      continue;
    }

    // 支持多种分隔符：- : 、空格、Tab、句号、顿号
    // 格式1: 单词 + 空格 + 中文词义
    const spaceMatch = line.match(/^([a-zA-Z]+)\s+([\u4e00-\u9fa5\s].+)$/);
    // 格式2: 单词 + 分隔符 + 中文词义
    const separatorMatch = line.match(/^([a-zA-Z]+)\s*[-：:、]\s*(.+)$/);

    let match = spaceMatch || separatorMatch;

    if (match) {
      const [, word, definition] = match;
      // 清理词义
      const cleanDefinition = definition.replace(/[\s\r\n]+/g, ' ').trim();
      console.log('[wordParser] 匹配成功 - 单词:', word, '词义:', cleanDefinition);
      words.push({
        word: word.toLowerCase(),
        pronunciation: '',
        partOfSpeech: '',
        definition: cleanDefinition,
        example: '',
        exampleTranslation: '',
      });
    } else {
      // 检查是否是纯英文单词（可能是列表格式）
      const pureWordMatch = line.match(/^([a-zA-Z]+)$/);
      if (pureWordMatch) {
        console.log('[wordParser] 发现纯单词:', pureWordMatch[1]);
      } else {
        console.log('[wordParser] 未匹配到格式:', line);
      }
    }
  }

  console.log('[wordParser] 简化格式解析完成，解析到', words.length, '个单词');
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

  console.log('[wordParser] 尝试解析列表格式，总行数:', lines.length);

  for (const line of lines) {
    console.log('[wordParser] 处理行:', line);

    // 纯单词（只包含字母）
    const match = line.match(/^([a-zA-Z]+)$/);

    if (match) {
      console.log('[wordParser] 匹配成功 - 单词:', match[1]);
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

  console.log('[wordParser] 列表格式解析完成，解析到', words.length, '个单词');
  return words;
}

/**
 * 使用字典API补充单词信息（优化版）
 * 跳过已经有词义的单词，只补充必要信息
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

  console.log('[wordParser] 开始补充单词信息，总单词数:', words.length);

  // 如果单词数量过多，跳过API调用，直接返回
  if (words.length > 200) {
    console.warn('[wordParser] 单词数量过多（>200），跳过字典API调用');
    return words;
  }

  const enriched: ParsedWord[] = [];

  for (const word of words) {
    // 如果单词已经有词义，说明是简化格式，直接使用（不调用API）
    if (word.definition && word.definition.trim()) {
      enriched.push(word);
      continue;
    }

    // 如果单词已经有完整信息，直接使用
    if (
      word.pronunciation &&
      word.partOfSpeech &&
      (!fetchExample || word.example)
    ) {
      enriched.push(word);
      continue;
    }

    // 只对没有词义的单词查询字典API
    try {
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
    } catch (error) {
      console.error('[wordParser] 查询字典失败:', word.word, error);
    }

    enriched.push(word);
  }

  console.log('[wordParser] 补充单词信息完成');
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
