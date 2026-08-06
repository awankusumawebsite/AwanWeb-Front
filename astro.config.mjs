import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));
const excludedSitemapRoute = /^\/(?:en\/|zh\/)?(?:404|faq|lacak|login|mitra|tools\/runner)(?:\/|$)/;
const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const env = loadEnv(mode, process.cwd(), '');
const backendOrigin = (env.PUBLIC_BACKEND_URL || 'https://cms.awankusuma.com')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

export default defineConfig({
  site: 'https://awankusuma.com',
  output: 'static',
  integrations: [
    react(),
    sitemap({
      filter: (page) => !excludedSitemapRoute.test(new URL(page).pathname),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/__cms': {
          target: backendOrigin,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/__cms/, ''),
        },
      },
    },
    resolve: {
      alias: {
        '@': fromRoot('./src'),
        'next/image': fromRoot('./src/compat/NextImage.jsx'),
        'next-intl': fromRoot('./src/compat/NextIntl.jsx'),
      },
    },
  },
});
