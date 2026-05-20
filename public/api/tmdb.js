// Vercel Serverless Function — TMDb proxy with Edge caching
// All users share cached responses → 1 TMDb request per URL, not per user

var TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';

module.exports = async function handler(req, res) {
  var path = req.query.path;
  if (!path) return res.status(400).json({ error: 'Missing path param' });

  var url = new URL('https://api.themoviedb.org/3' + path);
  url.searchParams.set('api_key', TMDB_API_KEY);

  Object.keys(req.query).forEach(function (k) {
    if (k !== 'path') url.searchParams.set(k, req.query[k]);
  });

  try {
    var resp = await fetch(url.toString());
    var data = await resp.json();

    // Cache on Vercel Edge CDN for 10 minutes, stale for 5 more
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: resp.statusText,
        status: resp.status,
        results: []
      });
    }

    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: 'Proxy fetch failed', results: [] });
  }
};
