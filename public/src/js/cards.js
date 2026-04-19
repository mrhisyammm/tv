// ============================================================
// CARDS — card creation & skeleton loaders
// ============================================================
import { posterUrl, getYear } from './api.js';
import { openModal } from './modal.js';

export function createCard(item, mediaType) {
  const type = mediaType || item.media_type || 'movie';
  const title = item.title || item.name || 'Untitled';
  const year = getYear(item.release_date || item.first_air_date);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('data-id', item.id);
  card.setAttribute('data-type', type);
  card.innerHTML = `
    <img class="card-poster" src="${posterUrl(item.poster_path)}" alt="${title}" loading="lazy">
    <div class="card-body">
      <div class="card-title">${title}</div>
      <div class="card-meta">
        <span class="card-year">${year}</span>
        <span class="card-rating">★ ${rating}</span>
      </div>
    </div>
    <div class="card-overlay">
      <div class="card-play-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </div>
    </div>`;

  card.addEventListener('click', () => openModal(item.id, type));
  return card;
}

export function createSkeletons(count = 10) {
  return Array.from({ length: count }, () => {
    const el = document.createElement('div');
    el.className = 'skeleton-card';
    el.innerHTML = `
      <div class="skeleton-poster"></div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>`;
    return el;
  });
}

export function renderSkeletons(rowId, count = 10) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';
  const skRow = document.createElement('div');
  skRow.className = 'card-skeleton-row';
  createSkeletons(count).forEach((s) => skRow.appendChild(s));
  row.appendChild(skRow);
}

export function renderRow(rowId, items, mediaType) {
  const row = document.getElementById(rowId);
  if (!row) return;
  row.innerHTML = '';
  if (!items || items.length === 0) {
    row.innerHTML = '<p style="color:var(--text-muted);padding:20px 0">No content available</p>';
    return;
  }
  items.forEach((item) => row.appendChild(createCard(item, mediaType)));
}
