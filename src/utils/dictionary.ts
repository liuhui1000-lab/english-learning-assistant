/**
 * 免费字典API工具类
 * 使用 dictionaryapi.dev 获取单词的发音、词性、释义和例句
 */

export interface DictionaryData {
  word: string;
  pronunciation: string;
  partOfSpeech: string;
  definition: string;
  example: string;
}

/**
 * 从免费字典API获取单词数据
 * @param word - 单词
 * @returns 字典数据，失败返回 null
 */
export async function fetchFreeDictionary(word: string): Promise<DictionaryData | null> {
  try {
    // 清理单词（去除空格、特殊字符）
    const cleanWord = word.trim().toLowerCase();
    
    if (!cleanWord || !/^[a-z]+$/.test(cleanWord)) {
      return null;
    }
    
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`字典API查询失败: ${cleanWord}, 状态码: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.warn(`字典API返回空数据: ${cleanWord}`);
      return null;
    }
    
    const entry = data[0];
    
    // 提取音标
    let pronunciation = '';
    if (entry.phonetic) {
      pronunciation = entry.phonetic;
    } else if (entry.phonetics && entry.phonetics.length > 0) {
      pronunciation = entry.phonetics.find((p: any) => p.text)?.text || '';
    }
    
    // 提取词性和释义
    let partOfSpeech = '';
    let definition = '';
    let example = '';
    
    if (entry.meanings && entry.meanings.length > 0) {
      const primaryMeaning = entry.meanings[0];
      partOfSpeech = primaryMeaning.partOfSpeech || '';
      
      if (primaryMeaning.definitions && primaryMeaning.definitions.length > 0) {
        definition = primaryMeaning.definitions[0].definition || '';
        example = primaryMeaning.definitions[0].example || '';
      }
    }
    
    return {
      word: entry.word,
      pronunciation,
      partOfSpeech,
      definition,
      example,
    };
  } catch (error) {
    console.error(`字典API调用异常: ${word}`, error);
    return null;
  }
}

/**
 * 批量获取字典数据（并发调用）
 * @param words - 单词数组
 * @returns 字典数据数组（失败的单词返回 null）
 */
export async function fetchMultipleDictionaries(words: string[]): Promise<(DictionaryData | null)[]> {
  const batchSize = 10; // 每批10个，避免并发过多
  const results: (DictionaryData | null)[] = [];
  
  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(word => fetchFreeDictionary(word))
    );
    
    results.push(...batchResults);
    
    // 短暂延迟，避免请求过快
    if (i + batchSize < words.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * 缓存管理（简单的内存缓存）
 */
const dictionaryCache = new Map<string, DictionaryData>();

/**
 * 带缓存的字典查询
 * @param word - 单词
 * @returns 字典数据
 */
export async function fetchDictionaryWithCache(word: string): Promise<DictionaryData | null> {
  const cacheKey = word.toLowerCase().trim();
  
  // 检查缓存
  if (dictionaryCache.has(cacheKey)) {
    return dictionaryCache.get(cacheKey)!;
  }
  
  // 查询API
  const data = await fetchFreeDictionary(word);
  
  if (data) {
    dictionaryCache.set(cacheKey, data);
  }
  
  return data;
}

/**
 * 清空缓存
 */
export function clearDictionaryCache(): void {
  dictionaryCache.clear();
}
