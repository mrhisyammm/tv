// ============================================================
// MAIN — app entry point
// ============================================================
import '../style.css';
import { GENRES } from './config.js';
import { tmdb } from './api.js';
import { initToast } from './toast.js';
import { renderRow, createSkeletons } from './cards.js';
import { loadHero } from './hero.js';
import { initModal } from './modal.js';
import { initSearch } from './search.js';
import { initNavigation } from './navigation.js';

// ── Data loading ──
async function loadAllRows() {
  const [
    trending, movies, series, topRated,
    action, horror, comedy, scifi,
    anime, drama, romance, thriller,
  ] = await Promise.all([
    tmdb('/trending/all/week'),
    tmdb('/movie/popular'),
    tmdb('/tv/popular'),
    tmdb('/movie/top_rated'),
    tmdb('/discover/movie', { with_genres: GENRES.action }),
    tmdb('/discover/movie', { with_genres: GENRES.horror }),
    tmdb('/discover/movie', { with_genres: GENRES.comedy }),
    tmdb('/discover/movie', { with_genres: GENRES.scifi }),
    tmdb('/discover/tv', { with_genres: GENRES.anime }),
    tmdb('/discover/movie', { with_genres: GENRES.drama }),
    tmdb('/discover/movie', { with_genres: GENRES.romance }),
    tmdb('/discover/movie', { with_genres: GENRES.thriller }),
  ]);

  renderRow('row-trending', trending.results);
  renderRow('row-movies', movies.results, 'movie');
  renderRow('row-series', series.results, 'tv');
  renderRow('row-toprated', topRated.results, 'movie');
  renderRow('row-action', action.results, 'movie');
  renderRow('row-horror', horror.results, 'movie');
  renderRow('row-comedy', comedy.results, 'movie');
  renderRow('row-scifi', scifi.results, 'movie');
  renderRow('row-anime', anime.results, 'tv');
  renderRow('row-drama', drama.results, 'movie');
  renderRow('row-romance', romance.results, 'movie');
  renderRow('row-thriller', thriller.results, 'movie');
}

// ── Skeleton pre-render ──
function renderAllSkeletons() {
  const rows = [
    'row-trending', 'row-movies', 'row-series', 'row-toprated',
    'row-action', 'row-horror', 'row-comedy', 'row-scifi',
    'row-anime', 'row-drama', 'row-romance', 'row-thriller',
  ];
  rows.forEach((id) => {
    const row = document.getElementById(id);
    if (!row) return;
    row.innerHTML = '';
    const skRow = document.createElement('div');
    skRow.className = 'card-skeleton-row';
    createSkeletons(10).forEach((s) => skRow.appendChild(s));
    row.appendChild(skRow);
  });
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initToast();
  initModal();
  initSearch();
  initNavigation();

  renderAllSkeletons();
  Promise.all([loadHero(), loadAllRows()]);
});
