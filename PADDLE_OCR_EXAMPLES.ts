/**
 * PaddleOCR 使用示例
 * 演示如何使用 PaddleOCR API 进行图片文字识别
 */

import {
  recognizeWithPaddleOCR,
  recognizeBatchWithPaddleOCR,
  initPaddleOCR,
} from '@/utils/paddleOCR';

// ============================================
// 示例 1：识别单张图片
// ============================================

async function example1_singleImage() {
  // 1. 初始化配置（通常在应用启动时调用一次）
  initPaddleOCR({
    apiUrl: 'https://your-paddleocr-api.com/api/ocr',
    token: 'your_api_token_here',
  });

  // 2. 准备图片文件
  const imageFile = new File([''], 'example.jpg', { type: 'image/jpeg' });

  // 3. 进行识别
  const result = await recognizeWithPaddleOCR(
    imageFile,
    (progress) => {
      console.log(`识别进度: ${progress}%`);
    }
  );

  // 4. 处理结果
  if (result.success) {
    console.log('识别成功！');
    console.log('识别结果:', result.text);
    console.log('置信度:', result.confidence);
    console.log('行数:', result.lines.length);

    // 遍历每一行
    result.lines.forEach((line, index) => {
      console.log(`第 ${index + 1} 行:`, line.text);
      console.log(`  置信度:`, line.confidence);
      console.log(`  位置:`, line.box);
    });
  } else {
    console.error('识别失败:', result.error);
  }
}

// ============================================
// 示例 2：批量识别多张图片
// ============================================

async function example2_batchImages() {
  // 1. 初始化配置
  initPaddleOCR({
    apiUrl: 'https://your-paddleocr-api.com/api/ocr',
    token: 'your_api_token_here',
  });

  // 2. 准备多张图片
  const imageFiles = [
    new File([''], 'image1.jpg', { type: 'image/jpeg' }),
    new File([''], 'image2.jpg', { type: 'image/jpeg' }),
    new File([''], 'image3.jpg', { type: 'image/jpeg' }),
  ];

  // 3. 批量识别
  const results = await recognizeBatchWithPaddleOCR(
    imageFiles,
    (progress) => {
      console.log(`整体进度: ${progress}%`);
    }
  );

  // 4. 处理结果
  results.forEach((result, index) => {
    console.log(`第 ${index + 1} 张图片:`);
    if (result.success) {
      console.log('  识别成功');
      console.log('  文本:', result.text);
      console.log('  置信度:', result.confidence);
    } else {
      console.log('  识别失败:', result.error);
    }
  });
}

// ============================================
// 示例 3：从 URL 获取图片并识别
// ============================================

async function example3_imageFromUrl() {
  // 1. 初始化配置
  initPaddleOCR({
    apiUrl: 'https://your-paddleocr-api.com/api/ocr',
    token: 'your_api_token_here',
  });

  // 2. 从 URL 获取图片
  const imageUrl = 'https://example.com/image.jpg';
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const imageFile = new File([blob], 'image.jpg', { type: blob.type });

  // 3. 进行识别
  const result = await recognizeWithPaddleOCR(imageFile);

  // 4. 处理结果
  if (result.success) {
    console.log('识别结果:', result.text);
  }
}

// ============================================
// 示例 4：在 React 组件中使用
// ============================================

function OCRComponent() {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<string>('');

  const handleImageUpload = async (file: File) => {
    setIsRecognizing(true);
    setProgress(0);

    try {
      const ocrResult = await recognizeWithPaddleOCR(
        file,
        (progress) => {
          setProgress(progress);
        }
      );

      if (ocrResult.success) {
        setResult(ocrResult.text);
        alert(`识别成功！\n置信度: ${ocrResult.confidence.toFixed(2)}%`);
      } else {
        alert(`识别失败: ${ocrResult.error}`);
      }
    } catch (error) {
      alert(`识别失败: ${error}`);
    } finally {
      setIsRecognizing(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleImageUpload(file);
          }
        }}
        disabled={isRecognizing}
      />

      {isRecognizing && (
        <div>
          <p>识别中... {progress}%</p>
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {result && (
        <div>
          <h3>识别结果：</h3>
          <pre>{result}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================
// 示例 5：错误处理
// ============================================

async function example5_errorHandling() {
  try {
    const result = await recognizeWithPaddleOCR(imageFile);

    if (!result.success) {
      // 处理识别错误
      switch (result.error) {
        case 'PaddleOCR 配置未设置':
          console.error('请先配置 API 地址和 Token');
          break;
        case 'API 请求失败':
          console.error('网络错误，请检查网络连接');
          break;
        default:
          console.error('未知错误:', result.error);
      }
      return;
    }

    // 处理成功结果
    console.log('识别结果:', result.text);

  } catch (error) {
    console.error('发生异常:', error);
  }
}

// ============================================
// 示例 6：识别手写文字
// ============================================

async function example6_handwriting() {
  initPaddleOCR({
    apiUrl: 'https://your-paddleocr-api.com/api/ocr',
    token: 'your_api_token_here',
  });

  const handwritingImage = new File([''], 'handwriting.jpg');

  const result = await recognizeWithPaddleOCR(handwritingImage);

  if (result.success) {
    console.log('手写文字识别结果:', result.text);

    // 检查置信度
    if (result.confidence > 0.8) {
      console.log('识别结果可靠');
    } else {
      console.log('识别结果可能不准确，建议人工校对');
    }
  }
}

// ============================================
// 示例 7：识别中英文混合
// ============================================

async function example7_mixedLanguage() {
  initPaddleOCR({
    apiUrl: 'https://your-paddleocr-api.com/api/ocr',
    token: 'your_api_token_here',
  });

  const mixedLanguageImage = new File([''], 'mixed.jpg');

  const result = await recognizeWithPaddleOCR(mixedLanguageImage);

  if (result.success) {
    console.log('中英文混合识别结果:', result.text);

    // 检测语言
    const hasChinese = /[\u4e00-\u9fa5]/.test(result.text);
    const hasEnglish = /[a-zA-Z]/.test(result.text);

    console.log('包含中文:', hasChinese);
    console.log('包含英文:', hasEnglish);
  }
}

// ============================================
// 使用提示
// ============================================

/*
1. 图片质量要求：
   - 分辨率：建议 >= 300 DPI
   - 格式：JPG, PNG
   - 清晰度：清晰、无模糊
   - 对比度：良好的文字和背景对比

2. 性能优化：
   - 大图片建议先压缩
   - 建议使用合理的分辨率（< 2000x2000）
   - 批量识别时，建议分批处理

3. 错误处理：
   - 检查 API 配置是否正确
   - 检查网络连接
   - 检查图片格式是否支持

4. 置信度：
   - > 90%：识别结果可靠
   - 80% - 90%：识别结果可能有小错误
   - < 80%：建议人工校对

5. API 配额：
   - PaddleOCR API 提供 100万次/月免费配额
   - 超出后需要额外付费
   - 可以在控制台查看配额使用情况
*/

export default example1_singleImage;
