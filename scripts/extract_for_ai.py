#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
提取单词信息，用于 AI 推断
"""

from docx import Document
import json

def extract_for_ai(file_path, grade, semester):
    """提取音标和释义，用于 AI 推断"""
    doc = Document(file_path)

    items = []

    for para in doc.paragraphs:
        text = para.text.strip()

        # 跳过标题
        if any(keyword in text for keyword in ['初中英语牛津上海版', '六年级', '七年级', '八年级', '上册', '下册', 'Unit', '单元']):
            continue

        # 尝试匹配格式：数字.________[音标] 词性. 释义
        # 或者：数字.________音标 释义
        import re

        # 模式1：有音标
        pattern1 = r'^(\d+\.?)________\[?([^\[\]]*)\]?\s*(?:([a-zA-Z\.]+)\.\s*)?(.+)$'
        match = re.match(pattern1, text)

        if match:
            num = match.group(1)
            phonetic = match.group(2).strip()
            pos = match.group(3) or ''
            meaning = match.group(4).strip()

            if phonetic and meaning:
                items.append({
                    'num': num,
                    'phonetic': phonetic,
                    'pos': pos,
                    'meaning': meaning,
                    'grade': grade,
                    'semester': semester,
                    'file': file_path.split('/')[-1]
                })

    return items

def main():
    files = [
        ('/workspace/projects/assets/【上海】六上英语单词背默.docx', '6', '上'),
        ('/workspace/projects/assets/【上海】六下英语单词背默.docx', '6', '下'),
        ('/workspace/projects/assets/【上海】七上英语单词背默.docx', '7', '上'),
        ('/workspace/projects/assets/【上海】七下英语单词背默.docx', '7', '下'),
        ('/workspace/projects/assets/【上海】八上英语单词背默.docx', '8', '上'),
        ('/workspace/projects/assets/【上海】八下英语单词背默.docx', '8', '下'),
    ]

    all_items = []

    for file_path, grade, semester in files:
        print(f"提取: {file_path}")
        items = extract_for_ai(file_path, grade, semester)
        print(f"  - 提取到 {len(items)} 条")
        all_items.extend(items)

    # 保存到 JSON
    output_file = '/workspace/projects/scripts/words_for_ai.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)

    print(f"\n✓ 总共提取 {len(all_items)} 条需要 AI 推断的数据")
    print(f"✓ 已保存到: {output_file}")

    # 显示前10条作为示例
    print("\n前10条示例:")
    for item in all_items[:10]:
        print(f"  [{item['num']}] {item['phonetic']} - {item['meaning']}")

if __name__ == '__main__':
    main()
