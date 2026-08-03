import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  site: 'https://awankusuma.com',
  output: 'static',
  integrations: [react(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': fromRoot('./src'),
        'next/image': fromRoot('./src/compat/NextImage.jsx'),
        'next-intl': fromRoot('./src/compat/NextIntl.jsx'),
      },
    },
  },
});
