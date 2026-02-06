#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
读取上海初中英语单词表（.docx 格式）
"""

from docx import Document
import json
import sys

def read_docx(file_path):
    """读取 docx 文件内容"""
    try:
        doc = Document(file_path)
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                paragraphs.append(para.text.strip())
        return paragraphs
    except Exception as e:
        print(f"读取文件失败 {file_path}: {e}")
        return []

def parse_words(paragraphs, grade, semester):
    """
    解析单词信息
    根据常见的单词表格式，解析单词、音标、释义
    """
    words = []
    current_word = None

    for para in paragraphs:
        # 跳过标题行
        if any(keyword in para for keyword in ['Unit', '单元', 'Lesson', 'Word', '单词', 'Vocabulary', '附录', 'Appendix']):
            continue

        # 尝试解析单词行
        # 常见格式：
        # 1. abandon /əˈbændən/ v. 放弃
        # 2. ability /əˈbɪləti/ n. 能力
        # 3. able /ˈeɪbl/ adj. 能够

        import re

        # 尝试匹配格式：数字. 单词 音标 词性. 释义
        pattern1 = r'^(\d+\.?\s*)?([a-zA-Z-]+)\s+(/[^/]+/)?\s*(?:([a-zA-Z\.]+)\s+)?(.+)$'

        match = re.match(pattern1, para)
        if match:
            num_prefix = match.group(1)
            word = match.group(2)
            phonetic = match.group(3) or ''
            pos = match.group(4) or ''
            meaning = match.group(5).strip()

            if word and meaning:
                words.append({
                    'word': word,
                    'phonetic': phonetic,
                    'meaning': meaning,
                    'pos': pos,
                    'grade': grade,
                    'semester': semester
                })

    return words

def main():
    files = [
        ('/workspace/projects/assets/【上海】六上英语单词背默.docx', '6', '上'),
        ('/workspace/projects/assets/【上海】六下英语单词背默.docx', '6', '下'),
        ('/workspace/projects/assets/【上海】七上英语单词背默.docx', '7', '上'),
        ('/workspace/projects/assets/【上海】七下英语单词背默.docx', '7', '下'),
        ('/workspace/projects/assets/【上海】八上英语单词背默.docx', '8', '上'),
        ('/workspace/projects/assets/【上海】八下英语单词背默.docx', '8', '下'),
    ]

    all_words = {}

    for file_path, grade, semester in files:
        print(f"\n正在读取: {file_path}")
        paragraphs = read_docx(file_path)

        if paragraphs:
            print(f"  - 共读取 {len(paragraphs)} 行")
            # 显示前10行作为示例
            print("  - 前10行内容:")
            for i, line in enumerate(paragraphs[:10], 1):
                print(f"    {i}. {line}")

            words = parse_words(paragraphs, grade, semester)
            print(f"  - 解析出 {len(words)} 个单词")

            for word_data in words:
                word = word_data['word']
                # 避免重复
                if word not in all_words:
                    all_words[word] = word_data
                else:
                    # 如果已存在，更新为最新的学期
                    all_words[word]['grade'] = grade
                    all_words[word]['semester'] = semester
        else:
            print("  - 读取失败或文件为空")

    # 保存到 JSON 文件
    output_file = '/workspace/projects/scripts/parsed_words.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(list(all_words.values()), f, ensure_ascii=False, indent=2)

    print(f"\n✓ 总共解析出 {len(all_words)} 个单词")
    print(f"✓ 已保存到: {output_file}")

    # 显示统计信息
    stats = {}
    for word_data in all_words.values():
        key = f"{word_data['grade']}{word_data['semester']}"
        stats[key] = stats.get(key, 0) + 1

    print("\n各年级学期单词统计:")
    for key in sorted(stats.keys()):
        print(f"  {key}年级: {stats[key]} 个")

if __name__ == '__main__':
    main()
