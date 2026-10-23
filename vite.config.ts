import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages 주소는 https://<아이디>.github.io/material-media-motif-generator/ 이므로
// 빌드와 빌드 결과 미리보기(npm run preview)에서는 하위 경로를 base로 쓴다. 로컬 개발(npm run dev)은 '/' 그대로.
const PAGES_BASE = '/material-media-motif-generator/';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PAGES_BASE : '/',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
}));
