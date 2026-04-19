// ============================================================
// HERO — hero banner section
// ============================================================
import { tmdb, backdropUrl, getYear, getRating } from './api.js';
import { openModal } from './modal.js';

let heroItem = null;

export function getHeroItem() {
  return heroItem;
}

export async function loadHero() {
  const heroBd = document.getElementById('hero-backdrop');
  const heroTitle = document.getElementById('hero-title');
  const heroOverview = document.getElementById('hero-overview');
  const heroRating = document.getElementById('hero-rating');
  const heroYear = document.getElementById('hero-year');
  const heroType = document.getElementById('hero-type');
  const heroPlayBtn = document.getElementById('hero-play-btn');
  const heroInfoBtn = document.getElementById('hero-info-btn');

  const data = await tmdb('/trending/all/week');
  if (!data.results?.length) return;

  const item = data.results[Math.floor(Math.random() * Math.min(10, data.results.length))];
  heroItem = item;

  const type = item.media_type || 'movie';
  const title = item.title || item.name || '';
  const year = getYear(item.release_date || item.first_air_date);
  const rating = item.vote_average;

  heroBd.style.backgroundImage = `url('${backdropUrl(item.backdrop_path)}')`;
  heroTitle.textContent = title;
  heroOverview.textContent = item.overview || 'Curated content for you.';
  heroRating.textContent = getRating(rating);
  heroYear.textContent = year;
  heroType.textContent = type === 'tv' ? 'SERIES' : 'MOVIE';

  heroPlayBtn.onclick = () => openModal(item.id, type, true);
  heroInfoBtn.onclick = () => openModal(item.id, type, false);
}
