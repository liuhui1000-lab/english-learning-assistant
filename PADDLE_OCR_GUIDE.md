# PaddleOCR OCR 配置指南

## 什么是 PaddleOCR？

PaddleOCR 是飞桨（PaddlePaddle）开源的 OCR 文字识别工具，识别效果优于 Tesseract.js，特别适合中英文混合识别和手写文字识别。

## 优势对比

| 特性 | Tesseract.js | PaddleOCR API |
|------|-------------|--------------|
| 识别效果 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 手写文字 | ⭐⭐ | ⭐⭐⭐⭐ |
| 复杂排版 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 速度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 成本 | 免费 | 免费（100万次/月） |
| 部署难度 | 无需部署 | 无需部署 |
| 推荐度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 配置步骤

### 1. 获取 PaddleOCR API Token

请按照以下步骤获取你的 PaddleOCR API Token：

1. 访问 PaddleOCR 官方网站
2. 注册/登录账号
3. 进入控制台
4. 申请 API Token
5. 复制 Token

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件，添加以下配置：

```env
# PaddleOCR API 地址
NEXT_PUBLIC_PADDLE_OCR_API_URL=https://your-paddleocr-api.com/api/ocr

# PaddleOCR API Token
NEXT_PUBLIC_PADDLE_OCR_TOKEN=your_paddleocr_token_here
```

### 3. 重启开发服务器

配置环境变量后，需要重启开发服务器：

```bash
# 停止当前服务（Ctrl + C）
pnpm dev
```

### 4. 验证配置

访问智能导入页面，检查 OCR 引擎选择器是否显示 "PaddleOCR API" 选项。

## 使用方法

### 上传图片

1. 刷新页面
2. 进入「智能导入」页面
3. 选择「模拟卷」或「单词」类型
4. 开启「OCR 识别」开关
5. 选择 OCR 引擎为「PaddleOCR API」
6. 上传图片文件（扫描件或截图）
7. 等待识别完成
8. 自动上传识别出的文本

## 最佳实践

### 图片质量要求

- **分辨率**：建议 >= 300 DPI
- **格式**：JPG, PNG（推荐）
- **清晰度**：清晰、无模糊
- **对比度**：良好的文字和背景对比
- **方向**：正确的图片方向

### 适合识别的场景

✅ **最佳效果**：
- 清晰的打印文字
- 教科书扫描件
- 试卷截图
- 讲义图片

✅ **较好效果**：
- 清晰的手写文字
- 稍微歪斜的图片
- 中英文混合内容

⚠️ **可能识别较差**：
- 模糊的图片
- 低分辨率图片
- 复杂背景的文字
- 过度歪斜的图片

### 优化建议

1. **预处理图片**（可选）：
   - 调整亮度、对比度
   - 去除噪点
   - 校正图片方向

2. **选择合适的 OCR 引擎**：
   - 如果图片质量好，使用 PaddleOCR API
   - 如果不想配置 API，使用 Tesseract.js

3. **人工校对**：
   - OCR 识别可能有小错误
   - 建议人工校对重要内容

## API 配额管理

### 查看配额

你当前的配额：**100 万次/月**

### 配额用完怎么办？

1. 访问 PaddleOCR 控制台
2. 查看配额使用情况
3. 购买额外配额或等待下月重置
4. 临时切换到 Tesseract.js

## 常见问题

### Q: OCR 识别失败怎么办？

A: 检查以下几点：
1. API Token 是否正确配置
2. 图片格式是否支持（JPG, PNG）
3. 图片是否清晰
4. 查看浏览器控制台错误信息

### Q: 如何切换回 Tesseract.js？

A: 在智能导入页面，选择 OCR 引擎为「Tesseract.js（免费，纯前端）」即可。

### Q: API Token 会泄露吗？

A: `NEXT_PUBLIC_` 前缀的环境变量会暴露到浏览器端，但这没关系：
1. API Token 仅用于 OCR 识别
2. 可以在 PaddleOCR 控制台设置 IP 白名单
3. 可以设置调用频率限制

### Q: PaddleOCR 和 Tesseract.js 可以同时使用吗？

A: 可以。系统支持两个引擎，可以在上传时选择使用哪个。

## 技术实现

### PaddleOCR API 调用流程

1. 前端选择图片
2. 将图片转换为 Base64
3. 发送 POST 请求到 PaddleOCR API
4. API 返回识别结果（JSON）
5. 解析结果并展示

### 请求格式

```json
{
  "image": "base64_encoded_image",
  "det": true,
  "rec": true,
  "cls": true,
  "use_angle_cls": true,
  "lang": "ch"
}
```

### 响应格式

```json
{
  "results": [
    {
      "text": "识别出的文字",
      "confidence": 0.99,
      "box": [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    }
  ]
}
```

## 相关文件

- `src/utils/paddleOCR.ts` - PaddleOCR 工具类
- `src/config/paddleOCR.ts` - 配置文件
- `src/app/admin/smart-import/page.tsx` - 智能导入页面
- `.env.local` - 环境变量配置

## 支持

如有问题，请查看：
1. 浏览器控制台错误信息
2. PaddleOCR 官方文档
3. 项目 GitHub Issues
