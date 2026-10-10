import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const origin = (process.env.VITE_SITE_URL || 'https://buysell-storefront-v2.vercel.app').replace(/\/$/, '');
const publicRoutes = [
  '/', '/products', '/services', '/sourcing', '/upcoming', '/about',
  '/how-it-works', '/how-to-buy', '/how-to-sell', '/buyer-protection',
  '/seller-protection', '/delivery', '/safety', '/help', '/faq', '/contact',
  '/terms', '/privacy', '/cookies', '/refund-policy', '/prohibited-items',
];

const urls = publicRoutes.map((route) => ({ route, priority: route === '/' ? '1.0' : route === '/products' ? '0.9' : '0.6' }));
const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

if (supabaseUrl && publishableKey) {
  const client = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.from('products').select('id,updated_at').eq('status', 'active').limit(1000);
  if (!error && data) {
    for (const product of data) urls.push({ route: `/product/legacy-${product.id}`, priority: '0.8', lastmod: product.updated_at });
  }
}

const escapeXml = (value) => String(value).replace(/[<>&'"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]);
const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(({ route, priority, lastmod }) => `  <url>
    <loc>${escapeXml(`${origin}${route}`)}</loc>
    <lastmod>${escapeXml(String(lastmod || today).slice(0, 10))}</lastmod>
    <changefreq>${route.startsWith('/product/') || route === '/products' ? 'daily' : 'weekly'}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

await writeFile(path.resolve(import.meta.dirname, '..', 'public', 'sitemap.xml'), xml, 'utf8');
