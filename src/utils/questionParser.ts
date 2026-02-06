/**
 * 智能题目解析器
 * 自动识别题目类型并分配到对应模块
 * 支持题型：
 * - 语法题 (grammar)
 * - 词转练习 (word-formation)
 * - 阅读理解 (reading)
 */

export interface Question {
  type: 'grammar' | 'word-formation' | 'reading';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  knowledgePoint?: string;
  subKnowledgePoint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: string;
  questionNumber?: number;
  // 词转练习特有字段
  baseWord?: string;
  targetWord?: string;
  transformationType?: string;
  // 阅读理解特有字段
  article?: string;
  articleQuestions?: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
  }>;
}

export interface ParseResult {
  success: boolean;
  totalQuestions: number;
  questions: Question[];
  summary: {
    grammar: number;
    wordFormation: number;
    reading: number;
  };
}

/**
 * 解析题目文本，自动识别题型
 */
export async function parseQuestions(
  text: string,
  options: {
    useAI?: boolean; // 是否使用AI辅助识别
  } = {}
): Promise<ParseResult> {
  const { useAI = true } = options;

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const questions: Question[] = [];

  // 策略1：先尝试规则匹配（快速）
  const ruleBasedQuestions = parseWithRules(lines);
  if (ruleBasedQuestions.length > 0) {
    return {
      success: true,
      totalQuestions: ruleBasedQuestions.length,
      questions: ruleBasedQuestions,
      summary: {
        grammar: ruleBasedQuestions.filter(q => q.type === 'grammar').length,
        wordFormation: ruleBasedQuestions.filter(q => q.type === 'word-formation').length,
        reading: ruleBasedQuestions.filter(q => q.type === 'reading').length,
      },
    };
  }

  // 策略2：使用AI辅助识别（准确）
  if (useAI) {
    const aiQuestions = await parseWithAI(text);
    return aiQuestions;
  }

  // 策略3：都失败，返回空
  return {
    success: false,
    totalQuestions: 0,
    questions: [],
    summary: {
      grammar: 0,
      wordFormation: 0,
      reading: 0,
    },
  };
}

/**
 * 使用规则识别题目（快速但准确度较低）
 */
function parseWithRules(lines: string[]): Question[] {
  const questions: Question[] = [];
  let currentQuestion: Partial<Question> = {};
  let questionText = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 识别词转练习（带括号提示词）
    const wordFormationMatch = line.match(/\((\w+)\)/);
    if (wordFormationMatch) {
      // 保存上一个问题（如果有）
      if (questionText && Object.keys(currentQuestion).length > 0) {
        questions.push({
          ...currentQuestion,
          type: 'word-formation',
          question: questionText,
        } as Question);
      }

      // 开始新的词转练习
      currentQuestion = {
        type: 'word-formation',
        question: line,
        baseWord: wordFormationMatch[1],
        targetWord: '', // 需要从上下文推断
        transformationType: '', // 需要从上下文推断
      };
      questionText = line;
      continue;
    }

    // 识别语法题（选择题）
    if (line.match(/^\d+\./)) {
      // 保存上一个问题（如果有）
      if (questionText && Object.keys(currentQuestion).length > 0) {
        questions.push({
          ...currentQuestion,
          type: 'grammar',
          question: questionText,
        } as Question);
      }

      // 开始新的语法题
      currentQuestion = {
        type: 'grammar',
        questionNumber: parseInt(line.match(/^\d+/)?.[0] || '0'),
        question: line,
        options: [],
      };
      questionText = line;
      continue;
    }

    // 识别选项
    if (line.match(/^[A-D][\.\)]\s/)) {
      if (!currentQuestion.options) {
        currentQuestion.options = [];
      }
      currentQuestion.options.push(line);
      questionText += '\n' + line;
      continue;
    }

    // 识别阅读理解（长文本）
    if (line.length > 100 && !line.match(/^\d+\./)) {
      // 可能是阅读理解文章
      currentQuestion = {
        type: 'reading',
        article: line,
      };
      questionText = line;
      continue;
    }

    // 其他行，追加到当前问题
    if (questionText) {
      questionText += '\n' + line;
    }
  }

  // 保存最后一个问题
  if (questionText && Object.keys(currentQuestion).length > 0) {
    questions.push({
      ...currentQuestion,
      question: questionText,
    } as Question);
  }

  return questions;
}

/**
 * 使用AI识别题目（准确但较慢）
 */
async function parseWithAI(text: string): Promise<ParseResult> {
  try {
    const response = await fetch('/api/admin/exam/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    const data = await response.json();

    if (data.success) {
      return data.result;
    }

    return {
      success: false,
      totalQuestions: 0,
      questions: [],
      summary: {
        grammar: 0,
        wordFormation: 0,
        reading: 0,
      },
    };
  } catch (error) {
    console.error('AI解析失败:', error);
    return {
      success: false,
      totalQuestions: 0,
      questions: [],
      summary: {
        grammar: 0,
        wordFormation: 0,
        reading: 0,
      },
    };
  }
}

/**
 * 识别单个题目的类型（基于特征）
 */
export function identifyQuestionType(questionText: string): 'grammar' | 'word-formation' | 'reading' {
  // 词转练习特征
  if (questionText.match(/\(\w+\)/)) {
    return 'word-formation';
  }

  // 阅读理解特征（长文本）
  if (questionText.length > 200) {
    return 'reading';
  }

  // 默认语法题
  return 'grammar';
}

/**
 * 提取词转练习的提示词和目标词
 */
export function extractWordFormation(questionText: string): {
  baseWord: string;
  targetWord?: string;
  transformationType?: string;
} {
  // 匹配括号中的提示词
  const match = questionText.match(/\((\w+)\)/);
  const baseWord = match ? match[1] : '';

  // TODO: 需要从上下文推断目标词和转换类型
  return {
    baseWord,
    targetWord: '',
    transformationType: '',
  };
}

/**
 * 分组题目（按类型）
 */
export function groupQuestionsByType(questions: Question[]): {
  grammar: Question[];
  wordFormation: Question[];
  reading: Question[];
} {
  return {
    grammar: questions.filter(q => q.type === 'grammar'),
    wordFormation: questions.filter(q => q.type === 'word-formation'),
    reading: questions.filter(q => q.type === 'reading'),
  };
}
