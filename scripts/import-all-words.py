#!/usr/bin/env python3
"""批量导入所有年级的英语单词到数据库"""

import os
import sys
from pathlib import Path
from docx import Document
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 数据库连接
DB_URL = os.getenv('DATABASE_URL')

def parse_word_document(docx_path):
    """
    解析单词文档，提取单词、音标、释义
    文档格式示例：
    序号.________[音标] 词性.中文释义
    如：3.________[ˈkɔ:nə(r)] n.角
    """
    doc = Document(docx_path)
    words = []

    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if not text or text.startswith('#') or text.startswith('★'):
            continue

        # 跳过标题行
        if '单词表' in text or '年级' in text or '上册' in text or '下册' in text:
            continue

        # 解析格式：序号.________[音标] 词性.中文释义
        # 或：序号.________[音标] 中文释义

        word = ""
        phonetic = ""
        meaning = ""
        part_of_speech = ""

        # 先提取序号
        if '.' in text:
            parts = text.split('.', 1)
            if parts[0].strip().isdigit():
                text = parts[1].strip()

        # 跳过空白单词
        if text.startswith('________'):
            continue

        # 提取音标 [xxx]
        if '[' in text and ']' in text:
            start = text.find('[')
            end = text.find(']')
            word = text[:start].strip()
            phonetic = text[start:end+1].strip()
            text = text[end+1:].strip()

            # 提取词性和释义
            # 格式可能是：n.角 或 n. 角
            # 提取第一个词性标记
            pos_patterns = ['n.', 'v.', 'adj.', 'adv.', 'prep.', 'pron.', 'conj.', 'interj.', 'art.']
            for pos in pos_patterns:
                if text.startswith(pos):
                    text = text[len(pos):].strip()
                    part_of_speech = pos.rstrip('.')
                    break
                elif text.startswith(pos[:-1] + ' '):
                    text = text[len(pos[:-1] + ' '):].strip()
                    part_of_speech = pos.rstrip('.')
                    break

            meaning = text

        # 处理没有音标的情况（只有中文）
        elif not any(c.isalpha() for c in text.split()[0]):
            # 可能只有中文释义，没有英文单词
            continue

        else:
            # 尝试其他格式
            parts = text.split(None, 2)
            if len(parts) >= 2:
                word = parts[0].strip()
                if '[' in parts[1]:
                    phonetic = parts[1].strip()
                    if len(parts) > 2:
                        meaning = parts[2].strip()
                else:
                    meaning = ' '.join(parts[1:]).strip()

        # 清理和验证
        word = word.replace('________', '').strip()
        if not word or len(word) < 2:
            continue

        # 过滤非单词字符（允许连字符和撇号）
        cleaned_word = word.replace('-', '').replace("'", "")
        if not cleaned_word.isalpha():
            continue

        # 必须有释义
        if not meaning or meaning.strip() == '':
            continue

        words.append({
            'word': word,
            'phonetic': phonetic,
            'meaning': meaning,
            'part_of_speech': part_of_speech,
            'source': os.path.basename(docx_path)
        })

    return words

def insert_words_to_db(words):
    """插入单词到数据库"""
    conn = psycopg2.connect(DB_URL)
    cursor = conn.cursor()

    inserted_count = 0
    skipped_count = 0
    error_count = 0

    for word_data in words:
        try:
            cursor.execute("""
                INSERT INTO words (word, phonetic, meaning, difficulty)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (word) DO NOTHING
            """, (
                word_data['word'],
                word_data.get('phonetic') or None,
                word_data.get('meaning') or None,
                2,  # 默认难度
            ))

            if cursor.rowcount > 0:
                inserted_count += 1
            else:
                skipped_count += 1

        except Exception as e:
            error_count += 1
            print(f"❌ 插入失败 {word_data['word']}: {e}")

    conn.commit()
    cursor.close()
    conn.close()

    return inserted_count, skipped_count, error_count

def main():
    print("=" * 60)
    print("批量导入英语单词到数据库")
    print("=" * 60)

    # 查找所有 .docx 文件
    assets_dir = Path('/workspace/projects/assets')
    docx_files = list(assets_dir.glob('*.docx'))

    if not docx_files:
        print("❌ 未找到 .docx 文件")
        sys.exit(1)

    print(f"\n找到 {len(docx_files)} 个文档：")
    for f in docx_files:
        print(f"  - {f.name}")

    # 解析所有文档
    all_words = []
    for docx_file in docx_files:
        print(f"\n📖 正在解析: {docx_file.name}")
        words = parse_word_document(docx_file)
        print(f"  ✅ 提取到 {len(words)} 个单词")
        all_words.extend(words)

    print(f"\n📊 总计提取 {len(all_words)} 个单词")

    # 去重
    unique_words = {}
    for w in all_words:
        if w['word'] not in unique_words:
            unique_words[w['word']] = w

    unique_word_list = list(unique_words.values())
    print(f"📊 去重后: {len(unique_word_list)} 个单词")

    # 导入数据库
    print("\n📥 开始导入数据库...")
    inserted, skipped, errors = insert_words_to_db(unique_word_list)

    print(f"\n" + "=" * 60)
    print("导入完成！")
    print(f"✅ 成功插入: {inserted} 个")
    print(f"⏭️  跳过重复: {skipped} 个")
    print(f"❌ 失败: {errors} 个")
    print(f"📊 数据库总单词数: {inserted + skipped} 个")
    print("=" * 60)

if __name__ == '__main__':
    main()
