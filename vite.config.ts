import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages 的網址是 https://<帳號>.github.io/german-learn/,靜態檔要從子路徑載入
  base: '/german-learn/',
  plugins: [react(), tailwindcss()],
})
