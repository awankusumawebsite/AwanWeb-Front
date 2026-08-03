const PRIVATE_PATHS = [
  '/api/',
  '/auth/',
  '/login',
  '/en/login',
  '/zh/login',
  '/lacak',
  '/en/lacak',
  '/zh/lacak',
  '/mitra',
  '/en/mitra',
  '/zh/mitra',
];

export function createRobotsTxt(blockAll: boolean): string {
  if (blockAll) {
    return 'User-agent: *\nDisallow: /\n';
  }

  return [
    'User-agent: *',
    'Allow: /',
    ...PRIVATE_PATHS.map((path) => `Disallow: ${path}`),
    'Sitemap: https://awankusuma.com/sitemap-index.xml',
    '',
  ].join('\n');
}
