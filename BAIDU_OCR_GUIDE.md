# 百度 OCR 配置指南

## 什么是百度 OCR？

百度智能云 OCR（Optical Character Recognition）是百度推出的文字识别服务，提供高精度的图片文字识别能力，支持中英文混合识别、手写文字识别等多种场景。

## 优势对比

| 特性 | Tesseract.js | PaddleOCR | 百度 OCR |
|------|-------------|-----------|---------|
| 识别效果 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 手写文字 | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 复杂排版 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 速度 | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 国内访问 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 成本 | 免费 | 免费（100万次/月） | 免费（500次/天） |
| 部署难度 | 无需部署 | 无需部署 | 无需部署 |
| **推荐度** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 免费额度

百度 OCR 提供免费额度：

- **通用文字识别（标准版）**：500次/天
- **通用文字识别（高精度版）**：50次/天

详细说明：https://ai.baidu.com/ai-doc/AISTUDIO/Kmfl2ycs0

## 配置步骤

### 1. 获取 Access Token

#### 方法一：使用已提供的 Access Token（推荐）

如果你的 Access Token 已经配置好了，直接使用即可：

```env
NEXT_PUBLIC_BAIDU_OCR_ACCESS_TOKEN=483605608bc2d69ed9979463871dd4bc6095285a
```

#### 方法二：自己获取 Access Token

1. **注册百度智能云账号**
   - 访问 https://cloud.baidu.com/
   - 注册/登录百度账号

2. **开通 OCR 服务**
   - 访问 https://cloud.baidu.com/product/ocr
   - 点击「立即使用」开通服务
   - 完成实名认证

3. **创建应用**
   - 进入「控制台」
   - 点击「创建应用」
   - 填写应用名称
   - 选择 OCR 服务
   - 获取 **API Key** 和 **Secret Key**

4. **获取 Access Token**

使用以下命令获取 Access Token：

```bash
curl -s "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=YOUR_API_KEY&client_secret=YOUR_SECRET_KEY"
```

替换 `YOUR_API_KEY` 和 `YOUR_SECRET_KEY` 为你的实际值。

返回结果：

```json
{
  "refresh_token": "...",
  "expires_in": 2592000,
  "session_key": "...",
  "access_token": "483605608bc2d69ed9979463871dd4bc6095285a",
  "scope": "...",
  "session_secret": "..."
}
```

复制 `access_token` 的值。

### 2. 配置环境变量

在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_BAIDU_OCR_ACCESS_TOKEN=483605608bc2d69ed9979463871dd4bc6095285a
```

### 3. 重启开发服务器

配置环境变量后，需要重启开发服务器：

```bash
# 停止当前服务（Ctrl + C）
pnpm dev
```

### 4. 验证配置

访问智能导入页面，检查 OCR 引擎选择器是否显示「百度 OCR API」选项。

## 使用方法

### 上传图片

1. 刷新页面
2. 进入「智能导入」页面
3. 选择「模拟卷」或「单词」类型
4. 开启「OCR 识别」开关
5. 选择 OCR 引擎为「百度 OCR API」
6. 上传图片文件（扫描件或截图）
7. 等待识别完成
8. 自动上传识别出的文本

## API 调用说明

### 通用文字识别（标准版）

**接口地址**：
```
https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic
```

**请求参数**：
- `image`: 图片 Base64 编码
- `detect_direction`: 是否检测图像朝向（true/false）
- `language_type`: 识别语言类型（CHN_ENG/ENG/POR/FRE/GER/ITA/SPA/RUS/JAP/KOR）
- `detect_language`: 是否检测语言（true/false）

**响应结果**：
```json
{
  "words_result": [
    {
      "words": "识别出的文字"
    }
  ]
}
```

### 通用文字识别（高精度版）

**接口地址**：
```
https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic
```

**特点**：
- 识别精度更高
- 适合对识别精度要求高的场景
- 免费额度：50次/天

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
   - 国内用户推荐使用百度 OCR（访问速度快）
   - 国际用户推荐使用 PaddleOCR
   - 不想配置 API 可使用 Tesseract.js

3. **人工校对**：
   - OCR 识别可能有小错误
   - 建议人工校对重要内容

## 免费额度管理

### 查看配额

1. 访问百度智能云控制台
2. 进入「OCR 服务」
3. 查看调用次数统计

### 配额用完怎么办？

1. **等待下一天**：免费额度按天重置
2. **切换引擎**：临时切换到 PaddleOCR 或 Tesseract.js
3. **购买额外配额**：在控制台购买付费套餐

## 常见问题

### Q: OCR 识别失败怎么办？

A: 检查以下几点：
1. Access Token 是否正确配置
2. 图片格式是否支持（JPG, PNG）
3. 图片是否清晰
4. 查看浏览器控制台错误信息

### Q: 如何切换到其他 OCR 引擎？

A: 在智能导入页面，选择不同的 OCR 引擎即可：
- Tesseract.js（免费，纯前端）
- PaddleOCR API（推荐，识别效果好）
- 百度 OCR API（国内首选）

### Q: Access Token 会泄露吗？

A: `NEXT_PUBLIC_` 前缀的环境变量会暴露到浏览器端，但这没关系：
1. Access Token 仅用于 OCR 识别
2. 可以在百度智能云控制台设置 IP 白名单
3. 可以设置调用频率限制

### Q: 三个 OCR 引擎可以同时使用吗？

A: 可以。系统支持三个引擎，可以在上传时选择使用哪个。

### Q: 百度 OCR 和 PaddleOCR 哪个更好？

A: 根据使用场景选择：
- **国内用户**：推荐百度 OCR（访问速度快）
- **国际用户**：推荐 PaddleOCR
- **高精度需求**：推荐百度 OCR 高精度版

## 技术实现

### 百度 OCR API 调用流程

1. 前端选择图片
2. 将图片转换为 Base64
3. 发送 POST 请求到百度 OCR API
4. API 返回识别结果（JSON）
5. 解析结果并展示

### 请求格式

```json
{
  "image": "base64_encoded_image",
  "detect_direction": "true",
  "language_type": "CHN_ENG",
  "detect_language": "false"
}
```

### 响应格式

```json
{
  "words_result": [
    {
      "words": "识别出的文字"
    }
  ]
}
```

## 相关文件

- `src/utils/baiduOCR.ts` - 百度 OCR 工具类
- `src/config/baiduOCR.ts` - 配置文件
- `src/app/admin/smart-import/page.tsx` - 智能导入页面
- `.env.local` - 环境变量配置

## 支持

如有问题，请查看：
1. 浏览器控制台错误信息
2. 百度 OCR 官方文档：https://ai.baidu.com/ai-doc/OCR/Nk3h6bb13
3. 调用须知：https://ai.baidu.com/ai-doc/AISTUDIO/Kmfl2ycs0
4. 项目 GitHub Issues
