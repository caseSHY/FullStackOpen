import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // ④ 开发服务器（vite dev）专属配置
    proxy: { "/api": "http://localhost:3001" }, // ⑤ 代理规则
  },
});
