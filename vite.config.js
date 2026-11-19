import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  // 加载当前环境对应的 .env 文件（比如 .env.production）
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [vue()],
    // 动态读取环境变量中的基础路径。如果没配，默认用相对路径 './'
    base: env.VITE_BASE_URL || '/',
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/handle2-api': {
          target: 'https://gd.10086.cn',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/handle2-api/, '/apph5/openapi/app/handle2'),
          headers: {
            Referer: 'https://gd.10086.cn/'
          }
        }
      }
    }
  }
})