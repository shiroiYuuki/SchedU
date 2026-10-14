import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  // Support GitHub Pages repository subfolder deployment (e.g. /SchedU/)
  // Priority: 1. VITE_BASE_PATH, 2. GITHUB_REPOSITORY (e.g. "shiroiyuuki/SchedU" -> "/SchedU/"), 3. Fallback './'
  let base = process.env.VITE_BASE_PATH;
  if (!base && process.env.GITHUB_REPOSITORY) {
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1];
    if (repoName) {
      base = repoName.endsWith('.github.io') ? '/' : `/${repoName}/`;
    }
  }
  if (!base) {
    base = './';
  }

  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
