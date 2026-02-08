/**
 * 词族智能识别工具
 * 基于词根词缀规则自动识别单词的词族
 */

// 常见前缀
const PREFIXES = [
  'un', 'dis', 're', 'in', 'im', 'il', 'ir', 'non', 'mis', 'pre', 'pro',
  'anti', 'auto', 'co', 'de', 'ex', 'extra', 'fore', 'inter', 'mid',
  'over', 'post', 'pre', 'semi', 'sub', 'super', 'trans', 'tri', 'under',
];

// 常见后缀
const SUFFIXES = [
  // 名词后缀
  'er', 'or', 'ist', 'ism', 'tion', 'sion', 'ment', 'ness', 'ity', 'ance',
  'ence', 'ship', 'hood', 'age', 'ure', 'th', 'dom', 'ward',
  // 动词后缀
  'ate', 'ify', 'ize', 'ise', 'en',
  // 形容词后缀
  'able', 'ible', 'al', 'ful', 'ic', 'ive', 'less', 'ous', 'y', 'ish', 'ent',
  'ant', 'ed', 'ing', 'ly', 'ward',
  // 副词后缀
  'ly', 'wise', 'ward',
];

// 不规则词族映射（手动维护的常见词族）
const IRREGULAR_FAMILIES: Record<string, string[]> = {
  'be': ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
  'go': ['goes', 'went', 'gone', 'going'],
  'do': ['does', 'did', 'done', 'doing'],
  'have': ['has', 'had', 'having'],
  'make': ['makes', 'made', 'making'],
  'take': ['takes', 'took', 'taken', 'taking'],
  'come': ['comes', 'came', 'coming'],
  'see': ['sees', 'saw', 'seen', 'seeing'],
  'say': ['says', 'said', 'saying'],
  'tell': ['tells', 'told', 'telling'],
  'get': ['gets', 'got', 'gotten', 'getting'],
  'give': ['gives', 'gave', 'given', 'giving'],
  'find': ['finds', 'found', 'finding'],
  'think': ['thinks', 'thought', 'thinking'],
  'know': ['knows', 'knew', 'known', 'knowing'],
  'help': ['helps', 'helped', 'helping', 'helpful', 'helpfully', 'helpfulness'],
  'success': ['succeed', 'successful', 'successfully', 'success'],
  'happy': ['happily', 'happiness', 'unhappy', 'unhappily', 'happier', 'happiest'],
  'care': ['cares', 'cared', 'caring', 'careful', 'carefully', 'careless', 'carelessly'],
};

export interface WordFamilyMatch {
  baseWord: string;
  confidence: number; // 0-1，表示匹配的置信度
  relatedWords: string[];
  method: 'prefix' | 'suffix' | 'irregular' | 'exact';
}

/**
 * 提取单词的词根
 */
export function extractStem(word: string): string | null {
  const lowerWord = word.toLowerCase();

  // 检查前缀
  for (const prefix of PREFIXES) {
    if (lowerWord.startsWith(prefix) && lowerWord.length > prefix.length + 2) {
      return lowerWord.slice(prefix.length);
    }
  }

  // 检查后缀
  for (const suffix of SUFFIXES) {
    if (lowerWord.endsWith(suffix) && lowerWord.length > suffix.length + 2) {
      return lowerWord.slice(0, -suffix.length);
    }
  }

  return null;
}

/**
 * 识别单词属于哪个词族
 */
export function recognizeWordFamily(word: string): WordFamilyMatch | null {
  const lowerWord = word.toLowerCase();

  // 1. 检查不规则词族映射
  for (const [base, family] of Object.entries(IRREGULAR_FAMILIES)) {
    if (family.includes(lowerWord) || base === lowerWord) {
      return {
        baseWord: base,
        confidence: 0.95,
        relatedWords: family,
        method: 'irregular',
      };
    }
  }

  // 2. 检查前缀匹配
  for (const prefix of PREFIXES) {
    if (lowerWord.startsWith(prefix) && lowerWord.length > prefix.length + 2) {
      const stem = lowerWord.slice(prefix.length);
      if (stem.length >= 3) { // 词根至少3个字母
        return {
          baseWord: stem,
          confidence: 0.75,
          relatedWords: generateRelatedWords(stem),
          method: 'prefix',
        };
      }
    }
  }

  // 3. 检查后缀匹配
  for (const suffix of SUFFIXES) {
    if (lowerWord.endsWith(suffix) && lowerWord.length > suffix.length + 2) {
      const stem = lowerWord.slice(0, -suffix.length);
      if (stem.length >= 3) {
        return {
          baseWord: stem,
          confidence: 0.75,
          relatedWords: generateRelatedWords(stem),
          method: 'suffix',
        };
      }
    }
  }

  // 4. 无法识别
  return null;
}

/**
 * 生成相关单词（基于词根）
 */
export function generateRelatedWords(stem: string): string[] {
  const words: string[] = [];

  // 添加原始词根
  words.push(stem);

  // 添加常见变形
  words.push(`${stem}s`);
  words.push(`${stem}ed`);
  words.push(`${stem}ing`);

  // 添加常见后缀
  const commonSuffixes = ['er', 'able', 'ful', 'ly', 'ness', 'ment', 'tion', 'ive'];
  for (const suffix of commonSuffixes) {
    words.push(`${stem}${suffix}`);
  }

  // 添加常见前缀
  const commonPrefixes = ['un', 're', 'dis'];
  for (const prefix of commonPrefixes) {
    words.push(`${prefix}${stem}`);
  }

  // 去重
  return Array.from(new Set(words));
}

/**
 * 批量识别单词的词族
 */
export function recognizeWordFamilies(words: string[]): Map<string, WordFamilyMatch> {
  const familyMap = new Map<string, WordFamilyMatch>();

  for (const word of words) {
    const match = recognizeWordFamily(word);
    if (match) {
      const existing = familyMap.get(match.baseWord);
      if (existing) {
        // 合并相关单词
        const allWords = Array.from(new Set([...existing.relatedWords, ...match.relatedWords]));
        existing.relatedWords = allWords;
      } else {
        familyMap.set(match.baseWord, match);
      }
    }
  }

  return familyMap;
}

/**
 * 获取词族的名称（建议）
 */
export function suggestFamilyName(baseWord: string): string {
  return `${baseWord} 词族`;
}

/**
 * 计算两个单词的相似度
 */
export function calculateSimilarity(word1: string, word2: string): number {
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();

  // 完全相同
  if (w1 === w2) return 1;

  // 检查是否在同一词族
  const family1 = recognizeWordFamily(w1);
  const family2 = recognizeWordFamily(w2);

  if (family1 && family2 && family1.baseWord === family2.baseWord) {
    return 0.9;
  }

  // 编辑距离相似度
  const distance = levenshteinDistance(w1, w2);
  const maxLength = Math.max(w1.length, w2.length);
  return 1 - distance / maxLength;
}

/**
 * 计算编辑距离
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // 删除
          dp[i][j - 1] + 1,    // 插入
          dp[i - 1][j - 1] + 1 // 替换
        );
      }
    }
  }

  return dp[m][n];
}
