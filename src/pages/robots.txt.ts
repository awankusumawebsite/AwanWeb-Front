import type { APIRoute } from 'astro';
import { createRobotsTxt } from '../lib/robots-policy';

export const prerender = true;

export const GET: APIRoute = () => {
  const blockAll = import.meta.env.MIGRATION_NOINDEX !== 'false';

  return new Response(createRobotsTxt(blockAll), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
