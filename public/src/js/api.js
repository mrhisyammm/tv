// ============================================================
// API — TMDB fetch wrapper & URL helpers
// ============================================================
import { TMDB_BASE, TMDB_API_KEY, IMG_BASE, IMG_W1280, IMG_W500 } from './config.js';

export async function tmdb(path, params = {}, lang = 'en-US') {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', lang);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  } catch (e) {
    console.warn('[TMDB] fetch error', path, e.message);
    return { results: [] };
  }
}

export function posterUrl(path, size = 'w500') {
  return path
    ? `${IMG_BASE}/${size}${path}`
    : 'https://via.placeholder.com/300x450/111118/333344?text=No+Poster';
}

export function backdropUrl(path) {
  return path ? `${IMG_W1280}${path}` : '';
}

export function getYear(date) {
  return date ? new Date(date).getFullYear() : '';
}

export function getRating(vote) {
  return vote ? `★ ${vote.toFixed(1)}` : '';
}
