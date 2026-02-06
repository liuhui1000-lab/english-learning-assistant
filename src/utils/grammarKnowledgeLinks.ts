/**
 * 语法知识点系统讲解链接
 * 用于在练习解析中提供更深入的学习资源
 */

export interface GrammarKnowledgeLink {
  /**
   * 语法知识点名称
   */
  name: string;
  /**
   * 知识点URL
   */
  url: string;
  /**
   * 适用范围（类别）
   */
  categories: string[];
}

/**
 * 语法知识点链接库
 * 根据题目类别和子类别提供相应的学习链接
 */
export const GRAMMAR_KNOWLEDGE_LINKS: Record<string, GrammarKnowledgeLink> = {
  // 时态
  '一般现在时': {
    name: '一般现在时',
    url: 'https://baike.baidu.com/item/%E4%B8%80%E8%88%AC%E7%8E%B0%E5%9C%A8%E6%97%B6',
    categories: ['时态']
  },
  '现在进行时': {
    name: '现在进行时',
    url: 'https://baike.baidu.com/item/%E7%8E%B0%E5%9C%A8%E8%BF%9B%E8%A1%8C%E6%97%B6',
    categories: ['时态']
  },
  '过去进行时': {
    name: '过去进行时',
    url: 'https://baike.baidu.com/item/%E8%BF%87%E5%8E%BB%E8%BF%9B%E8%A1%8C%E6%97%B6',
    categories: ['时态']
  },
  '一般过去时': {
    name: '一般过去时',
    url: 'https://baike.baidu.com/item/%E4%B8%80%E8%88%AC%E8%BF%87%E5%8E%BB%E6%97%B6',
    categories: ['时态']
  },
  '现在完成时': {
    name: '现在完成时',
    url: 'https://baike.baidu.com/item/%E7%8E%B0%E5%9C%A8%E5%AE%8C%E6%88%90%E6%97%B6',
    categories: ['时态']
  },
  '过去完成时': {
    name: '过去完成时',
    url: 'https://baike.baidu.com/item/%E8%BF%87%E5%8E%BB%E5%AE%8C%E6%88%90%E6%97%B6',
    categories: ['时态']
  },
  '一般将来时': {
    name: '一般将来时',
    url: 'https://baike.baidu.com/item/%E4%B8%80%E8%88%AC%E6%9C%AA%E6%9D%A5%E6%97%B6',
    categories: ['时态']
  },

  // 语态
  '被动语态': {
    name: '被动语态',
    url: 'https://baike.baidu.com/item/%E8%A2%AB%E5%8A%A8%E8%AF%AD%E6%80%81',
    categories: ['语态']
  },

  // 从句
  '定语从句': {
    name: '定语从句',
    url: 'https://baike.baidu.com/item/%E5%AE%9A%E8%AF%AD%E4%BB%8E%E5%8F%A5',
    categories: ['从句']
  },
  '宾语从句': {
    name: '宾语从句',
    url: 'https://baike.baidu.com/item/%E5%AE%BE%E8%AF%AD%E4%BB%8E%E5%8F%A5',
    categories: ['从句']
  },
  '状语从句': {
    name: '状语从句',
    url: 'https://baike.baidu.com/item/%E7%8A%B6%E8%AF%AD%E4%BB%8E%E5%8F%A5',
    categories: ['从句']
  },
  '主语从句': {
    name: '主语从句',
    url: 'https://baike.baidu.com/item/%E4%B8%BB%E8%AF%AD%E4%BB%8E%E5%8F%A5',
    categories: ['从句']
  },
  '表语从句': {
    name: '表语从句',
    url: 'https://baike.baidu.com/item/%E8%A1%A8%E8%AF%AD%E4%BB%8E%E5%8F%A5',
    categories: ['从句']
  },

  // 非谓语动词
  '不定式': {
    name: '不定式',
    url: 'https://baike.baidu.com/item/%E4%B8%8D%E5%AE%9A%E5%BC%8F',
    categories: ['非谓语动词']
  },
  '动名词': {
    name: '动名词',
    url: 'https://baike.baidu.com/item/%E5%8A%A8%E5%90%8D%E8%AF%8D',
    categories: ['非谓语动词']
  },
  '分词': {
    name: '分词',
    url: 'https://baike.baidu.com/item/%E5%88%86%E8%AF%8D',
    categories: ['非谓语动词']
  },

  // 其他
  '名词': {
    name: '名词',
    url: 'https://baike.baidu.com/item/%E5%90%8D%E8%AF%8D',
    categories: ['词法']
  },
  '代词': {
    name: '代词',
    url: 'https://baike.baidu.com/item/%E4%BB%A3%E8%AF%8D',
    categories: ['词法']
  },
  '形容词': {
    name: '形容词',
    url: 'https://baike.baidu.com/item/%E5%BD%A2%E5%AE%B9%E8%AF%8D',
    categories: ['词法']
  },
  '副词': {
    name: '副词',
    url: 'https://baike.baidu.com/item/%E5%89%AF%E8%AF%8D',
    categories: ['词法']
  },
  '介词': {
    name: '介词',
    url: 'https://baike.baidu.com/item/%E4%BB%8B%E8%AF%8D',
    categories: ['词法']
  },
  '连词': {
    name: '连词',
    url: 'https://baike.baidu.com/item/%E8%BF%9E%E8%AF%8D',
    categories: ['词法']
  },
  '冠词': {
    name: '冠词',
    url: 'https://baike.baidu.com/item/%E5%86%A0%E8%AF%8D',
    categories: ['词法']
  },
  '数词': {
    name: '数词',
    url: 'https://baike.baidu.com/item/%E6%95%B0%E8%AF%8D',
    categories: ['词法']
  },
  '情态动词': {
    name: '情态动词',
    url: 'https://baike.baidu.com/item/%E6%83%85%E6%80%81%E5%8A%A8%E8%AF%8D',
    categories: ['词法']
  },
  '感叹句': {
    name: '感叹句',
    url: 'https://baike.baidu.com/item/%E6%84%9F%E5%8F%B9%E5%8F%A5',
    categories: ['句法']
  },
  '祈使句': {
    name: '祈使句',
    url: 'https://baike.baidu.com/item/%E7%A5%88%E4%BD%BF%E5%8F%A5',
    categories: ['句法']
  },
  '反意疑问句': {
    name: '反意疑问句',
    url: 'https://baike.baidu.com/item/%E5%8F%8D%E6%84%8F%E7%96%91%E9%97%AE%E5%8F%A5',
    categories: ['句法']
  },
  '主谓一致': {
    name: '主谓一致',
    url: 'https://baike.baidu.com/item/%E4%B8%BB%E8%B0%93%E4%B8%80%E8%87%B4',
    categories: ['句法']
  },
  '直接引语和间接引语': {
    name: '直接引语和间接引语',
    url: 'https://baike.baidu.com/item/%E7%9B%B4%E6%8E%A5%E5%BC%95%E8%AF%AD',
    categories: ['句法']
  },
};

/**
 * 根据类别获取语法知识点链接
 * @param category 类别
 * @param subcategory 子类别
 * @returns 语法知识点链接，如果没有匹配则返回null
 */
export function getGrammarKnowledgeLink(category: string, subcategory?: string): GrammarKnowledgeLink | null {
  // 先尝试匹配子类别
  if (subcategory && GRAMMAR_KNOWLEDGE_LINKS[subcategory]) {
    return GRAMMAR_KNOWLEDGE_LINKS[subcategory];
  }

  // 再尝试匹配类别
  if (GRAMMAR_KNOWLEDGE_LINKS[category]) {
    return GRAMMAR_KNOWLEDGE_LINKS[category];
  }

  return null;
}
