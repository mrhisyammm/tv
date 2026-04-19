// ============================================================
// CONFIG — TMDB API & Streaming Servers
// ============================================================
export const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
export const TMDB_BASE = 'https://api.themoviedb.org/3';
export const IMG_BASE = 'https://image.tmdb.org/t/p';
export const IMG_W500 = `${IMG_BASE}/w500`;
export const IMG_W1280 = `${IMG_BASE}/w1280`;
export const IMG_ORIG = `${IMG_BASE}/original`;

export const STREAMING_SERVERS = [
  {
    name: '2embed',
    movieUrl: (id) => `https://www.2embed.cc/embed/${id}`,
    tvUrl: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
  },
  {
    name: 'VidSrc',
    movieUrl: (id) => `https://vidsrc.to/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'VidSrc Pro',
    movieUrl: (id) => `https://vidsrc.pro/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://vidsrc.pro/embed/tv/${id}/${s}/${e}`,
  },
  {
    name: 'Smashy',
    movieUrl: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}`,
    tvUrl: (id, s, e) => `https://embed.smashystream.com/playere.php?tmdb=${id}&season=${s}&episode=${e}`,
  },
  {
    name: 'Embed.su',
    movieUrl: (id) => `https://embed.su/embed/movie/${id}`,
    tvUrl: (id, s, e) => `https://embed.su/embed/tv/${id}/${s}/${e}`,
  },
];

export const GENRES = {
  action: 28,
  comedy: 35,
  horror: 27,
  scifi: 878,
  anime: 16,
  drama: 18,
  romance: 10749,
  thriller: 53,
};

// Watchlist storage key
export const WATCHLIST_KEY = 'hisyamtv_watchlist';
// Watch history storage key
export const HISTORY_KEY = 'hisyamtv_history';
