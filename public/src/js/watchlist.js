// ============================================================
// WATCHLIST — localStorage-based watchlist & watch history
// ============================================================
import { WATCHLIST_KEY, HISTORY_KEY } from './config.js';
import { showToast } from './toast.js';

function getList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

// ── Watchlist ──
export function getWatchlist() {
  return getList(WATCHLIST_KEY);
}

export function isInWatchlist(id) {
  return getWatchlist().some((item) => item.id === id);
}

export function toggleWatchlist(item) {
  const list = getWatchlist();
  const idx = list.findIndex((i) => i.id === item.id);
  if (idx > -1) {
    list.splice(idx, 1);
    saveList(WATCHLIST_KEY, list);
    showToast('Removed from My List');
    return false;
  }
  list.unshift({
    id: item.id,
    title: item.title || item.name,
    poster_path: item.poster_path,
    media_type: item.media_type || 'movie',
    vote_average: item.vote_average,
    release_date: item.release_date || item.first_air_date,
    addedAt: Date.now(),
  });
  saveList(WATCHLIST_KEY, list);
  showToast('Added to My List');
  return true;
}

// ── Watch History ──
export function getHistory() {
  return getList(HISTORY_KEY);
}

export function addToHistory(item) {
  let list = getHistory();
  list = list.filter((i) => i.id !== item.id);
  list.unshift({
    id: item.id,
    title: item.title || item.name,
    poster_path: item.poster_path,
    backdrop_path: item.backdrop_path,
    media_type: item.media_type || 'movie',
    vote_average: item.vote_average,
    release_date: item.release_date || item.first_air_date,
    watchedAt: Date.now(),
  });
  if (list.length > 30) list = list.slice(0, 30);
  saveList(HISTORY_KEY, list);
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  showToast('Watch history cleared');
}
