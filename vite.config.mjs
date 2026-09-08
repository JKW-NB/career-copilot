import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  cacheDir: path.join(os.tmpdir(), 'career-copilot-vite-cache'),
  server: { watch: { ignored: ['**/src-tauri/**'] } },
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
  },
});
