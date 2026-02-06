/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用静态导出，用于国内托管
  output: 'export',
  
  // 禁用图片优化（静态导出不支持）
  images: {
    unoptimized: true,
  },

  // 设置基础路径（如果需要）
  // basePath: '',
  
  // 环境变量
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    DOUBAO_API_KEY: process.env.DOUBAO_API_KEY,
    OSS_ACCESS_KEY_ID: process.env.OSS_ACCESS_KEY_ID,
    OSS_ACCESS_KEY_SECRET: process.env.OSS_ACCESS_KEY_SECRET,
    OSS_BUCKET: process.env.OSS_BUCKET,
    OSS_ENDPOINT: process.env.OSS_ENDPOINT,
  },
}

module.exports = nextConfig
