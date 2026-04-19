// ============================================================
// SEARCH — search bar, suggestions, results
// ============================================================
import { tmdb, posterUrl } from './api.js';
import { createCard, createSkeletons } from './cards.js';
import { openModal } from './modal.js';

let searchTimer = null;
let searchWrap, searchToggle, searchInput, searchSection, searchGrid, suggBox;

export function initSearch() {
  searchWrap = document.getElementById('search-wrap');
  searchToggle = document.getElementById('search-toggle');
  searchInput = document.getElementById('search-input');
  searchSection = document.getElementById('search-results-section');
  searchGrid = document.getElementById('search-results-grid');
  suggBox = document.getElementById('search-suggestions');

  searchToggle.addEventListener('click', toggleSearch);

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 2) {
      suggBox.classList.remove('active');
      return;
    }
    searchTimer = setTimeout(() => showSuggestions(q), 400);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(searchTimer);
      suggBox.classList.remove('active');
      doSearch(e.target.value.trim());
    }
    if (e.key === 'Escape') toggleSearch();
  });

  document.addEventListener('click', (e) => {
    if (!searchWrap.contains(e.target)) {
      suggBox.classList.remove('active');
    }
  });
}

export function toggleSearch() {
  const isOpen = searchWrap.classList.toggle('open');
  if (isOpen) {
    searchInput.focus();
  } else {
    searchInput.value = '';
    searchSection.style.display = 'none';
    suggBox.classList.remove('active');
  }
}

export async function doSearch(query) {
  if (!query || query.length < 2) {
    searchSection.style.display = 'none';
    return;
  }
  searchSection.style.display = 'block';
  searchGrid.innerHTML = '';

  const skRow = document.createElement('div');
  skRow.style.display = 'contents';
  createSkeletons(8).forEach((s) => {
    s.style.flex = 'none';
    s.style.width = '100%';
    skRow.appendChild(s);
  });
  searchGrid.appendChild(skRow);

  const data = await tmdb('/search/multi', { query, include_adult: false });
  searchGrid.innerHTML = '';

  const filtered = (data.results || []).filter(
    (r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path
  );

  if (!filtered.length) {
    searchGrid.innerHTML = `<p style="color:var(--text-muted);padding:20px 0;grid-column:1/-1">No results for "${query}"</p>`;
    return;
  }

  filtered.forEach((item) => searchGrid.appendChild(createCard(item, item.media_type)));
  searchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function showSuggestions(query) {
  const data = await tmdb('/search/multi', { query, include_adult: false }, 'en-US');
  const filtered = (data.results || [])
    .filter((r) => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path)
    .slice(0, 6);

  suggBox.innerHTML = '';
  if (!filtered.length) {
    suggBox.innerHTML =
      '<div style="padding:12px;color:#aaa;font-size:13px;text-align:center;">No matches found</div>';
  } else {
    filtered.forEach((item) => {
      const type = item.media_type || 'movie';
      const year = (item.release_date || item.first_air_date || '').substring(0, 4);
      const title = item.title || item.name;
      const d = document.createElement('div');
      d.className = 'sugg-item';
      d.innerHTML = `
        <img src="${posterUrl(item.poster_path)}" class="sugg-img" alt="${title}">
        <div class="sugg-info">
          <span class="sugg-title">${title}</span>
          <span class="sugg-meta">${year} · ${type.toUpperCase()} · ★ ${item.vote_average?.toFixed(1) || 'N/A'}</span>
        </div>`;
      d.onclick = () => {
        openModal(item.id, type);
        suggBox.classList.remove('active');
        searchInput.value = '';
        toggleSearch();
      };
      suggBox.appendChild(d);
    });
  }
  suggBox.classList.add('active');
}
