# PaddleOCR 快速开始

## 🚀 3 步开始使用

### 第一步：获取 API Token

访问 PaddleOCR 官方网站，申请 API Token。

### 第二步：配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_PADDLE_OCR_API_URL=https://your-paddleocr-api.com/api/ocr
NEXT_PUBLIC_PADDLE_OCR_TOKEN=your_token_here
```

### 第三步：重启并使用

```bash
# 重启开发服务器
pnpm dev
```

然后：
1. 访问 http://localhost:5000/admin/smart-import
2. 开启「OCR 识别」
3. 选择「PaddleOCR API」
4. 上传图片

## 📊 效果对比

| 引擎 | 识别效果 | 速度 | 成本 |
|------|---------|------|------|
| **PaddleOCR** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 免费（100万次/月）|
| Tesseract.js | ⭐⭐⭐ | ⭐⭐⭐ | 免费 |

## ✨ 主要优势

- ✅ 识别效果更好（特别是手写文字）
- ✅ 支持中英文混合
- ✅ 识别速度快
- ✅ 免费（100万次/月）
- ✅ 无需部署

## 📝 使用场景

- 📄 扫描件识别
- 📚 教科书识别
- 📝 试卷识别
- 📖 错题识别

## 📚 详细文档

- [配置指南](./PADDLE_OCR_GUIDE.md)
- [测试清单](./PADDLE_OCR_TEST.md)

## 🆘 遇到问题？

1. 检查 `.env.local` 配置
2. 查看浏览器控制台（F12）
3. 查看详细文档

---

**提示**：首次使用前，请确保已配置 API Token！
