/**
 * Cloudflare Worker — Proxy RSS Substack
 * Route /api/rss?feed=aixleaders|uglytruth
 * Toutes les autres requetes passent aux assets statiques.
 */

const FEEDS = {
  aixleaders: 'https://aixleaders.substack.com/feed',
  uglytruth: 'https://nashsuglytruth.substack.com/feed',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- API : proxy RSS ---
    if (url.pathname === '/api/rss') {
      const feedKey = url.searchParams.get('feed');
      const feedUrl = FEEDS[feedKey];

      if (!feedUrl) {
        return new Response(JSON.stringify({ error: 'Feed inconnu' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      try {
        const res = await fetch(feedUrl, {
          headers: { 'User-Agent': 'AI-x-Leaders-RSS/1.0' },
          cf: { cacheTtl: 3600 },
        });
        const xml = await res.text();

        // Extraire les 2 premiers <item> du RSS
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null && items.length < 2) {
          const itemXml = match[1];
          const title = (itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                         itemXml.match(/<title>(.*?)<\/title>/) || [])[1] || '';
          const link = (itemXml.match(/<link>(.*?)<\/link>/) || [])[1] || '';
          const pubDate = (itemXml.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
          items.push({ title, link, pubDate });
        }

        return new Response(JSON.stringify({ items }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // --- Tout le reste : assets statiques ---
    return env.ASSETS.fetch(request);
  },
};
