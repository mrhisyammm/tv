// ============================================================
// MODAL — detail view, player, episodes, streaming
// ============================================================
import { STREAMING_SERVERS, IMG_W500 } from './config.js';
import { tmdb, posterUrl, backdropUrl, getYear } from './api.js';
import { showToast } from './toast.js';
import { toggleWatchlist, isInWatchlist, addToHistory } from './watchlist.js';

let activeServer = 0;
let currentStream = null;
let currentItem = null;
let currentEps = [];
let currentSeasons = [];

// DOM refs (lazy-loaded)
let modalOverlay, modal, modalClose, modalTitle, modalOverview;
let modalYear, modalRuntime, modalRating, modalType, modalGenres;
let modalPlayBtn, playerWrapper, playerPoster, playerPlayBig;
let playerPlaceh, ytContainer, ytIframe, streamContainer, streamIframe;
let similarGrid;

function ensureRefs() {
  if (modalOverlay) return;
  modalOverlay = document.getElementById('modal-overlay');
  modal = document.getElementById('modal');
  modalClose = document.getElementById('modal-close');
  modalTitle = document.getElementById('modal-title');
  modalOverview = document.getElementById('modal-overview');
  modalYear = document.getElementById('modal-year');
  modalRuntime = document.getElementById('modal-runtime');
  modalRating = document.getElementById('modal-rating');
  modalType = document.getElementById('modal-type');
  modalGenres = document.getElementById('modal-genres');
  modalPlayBtn = document.getElementById('modal-play-btn');
  playerWrapper = document.getElementById('player-wrapper');
  playerPoster = document.getElementById('player-poster');
  playerPlayBig = document.getElementById('player-play-big');
  playerPlaceh = document.getElementById('player-placeholder');
  ytContainer = document.getElementById('youtube-container');
  ytIframe = document.getElementById('youtube-iframe');
  streamContainer = document.getElementById('stream-container');
  streamIframe = document.getElementById('stream-iframe');
  similarGrid = document.getElementById('similar-grid');
}

// ── Streaming ──
function buildStreamUrl(id, type, season = 1, episode = 1) {
  const srv = STREAMING_SERVERS[activeServer];
  return type === 'tv' ? srv.tvUrl(id, season, episode) : srv.movieUrl(id);
}

function loadStream(id, type, season = 1, episode = 1) {
  ensureRefs();
  currentStream = { id, type, season, episode };
  ytContainer.style.display = 'none';
  playerPlaceh.style.display = 'none';
  streamContainer.style.display = 'block';
  streamIframe.src = buildStreamUrl(id, type, season, episode);
}

function switchServer(idx) {
  ensureRefs();
  activeServer = idx;
  document.querySelectorAll('.server-btn').forEach((b, i) => {
    b.classList.toggle('active', i === idx);
  });
  if (currentStream) {
    const { id, type, season, episode } = currentStream;
    streamIframe.src = buildStreamUrl(id, type, season, episode);
    showToast(`Switched to ${STREAMING_SERVERS[idx].name}`);
  }
}

// ── Episodes ──
async function fetchEpisodes(tvId, seasonNum) {
  const sData = await tmdb(`/tv/${tvId}/season/${seasonNum}`, {}, 'en-US');
  currentEps = sData.episodes || [];
  renderEpisodesList(tvId, seasonNum);
}

function renderEpisodesList(tvId, seasonNum) {
  const epsContainer = document.getElementById('eps-container');
  if (!epsContainer) return;
  epsContainer.innerHTML = '';
  if (!currentEps.length) {
    epsContainer.innerHTML = '<p style="color:#aaa;font-size:14px;">No episodes found.</p>';
    return;
  }
  currentEps.forEach((ep) => {
    const isActive =
      currentStream &&
      currentStream.season == seasonNum &&
      currentStream.episode == ep.episode_number;
    const epCard = document.createElement('div');
    epCard.className = `ep-card${isActive ? ' ep-card--active' : ''}`;
    epCard.onclick = () => {
      loadStream(tvId, 'tv', seasonNum, ep.episode_number);
      renderEpisodesList(tvId, seasonNum);
    };
    const imgUrl = ep.still_path
      ? IMG_W500 + ep.still_path
      : 'https://via.placeholder.com/300x170/111118/333344?text=No+Image';
    const synopsis = ep.overview || 'No synopsis available.';
    epCard.innerHTML = `
      <img class="ep-card__img" src="${imgUrl}" alt="Episode ${ep.episode_number}">
      <div class="ep-card__info">
        <h4 class="ep-card__title">${ep.episode_number}. ${ep.name}</h4>
        <p class="ep-card__synopsis">${synopsis}</p>
      </div>`;
    epsContainer.appendChild(epCard);
  });
}

// ── Modal ──
export async function openModal(id, type, autoPlay = false) {
  ensureRefs();

  // Reset player
  ytContainer.style.display = 'none';
  streamContainer.style.display = 'none';
  playerPlaceh.style.display = 'block';
  ytIframe.src = '';
  streamIframe.src = '';
  currentStream = null;
  currentSeasons = [];
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Clear previous
  modalTitle.textContent = 'Loading...';
  modalOverview.textContent = '';
  modalGenres.innerHTML = '';
  similarGrid.innerHTML = '';

  // Remove old dynamic elements
  document.getElementById('episode-selector')?.remove();
  document.getElementById('stream-actions')?.remove();
  document.getElementById('watch-now-btn')?.remove();
  document.getElementById('watchlist-btn')?.remove();

  try {
    const [detail, videoDataEN, similar] = await Promise.all([
      tmdb(`/${type}/${id}`, { append_to_response: 'credits' }),
      tmdb(`/${type}/${id}/videos`, {}, 'en-US'),
      tmdb(`/${type}/${id}/similar`),
    ]);

    const videoData = { results: videoDataEN.results || [] };

    currentItem = { ...detail, media_type: type };

    // Add to watch history
    addToHistory(currentItem);

    const title = detail.title || detail.name || '';
    const year = getYear(detail.release_date || detail.first_air_date);
    const runtime = detail.runtime
      ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m`
      : detail.number_of_seasons
        ? `${detail.number_of_seasons} Season${detail.number_of_seasons > 1 ? 's' : ''}`
        : '';
    const rating = detail.vote_average?.toFixed(1) || 'N/A';

    modalTitle.textContent = title;
    modalOverview.textContent = detail.overview || 'No description available.';
    modalYear.textContent = year;
    modalRuntime.textContent = runtime;
    modalRating.textContent = `★ ${rating}`;
    modalType.textContent = type === 'tv' ? 'SERIES' : 'MOVIE';

    if (detail.genres?.length) {
      detail.genres.forEach((g) => {
        const pill = document.createElement('span');
        pill.className = 'genre-pill';
        pill.textContent = g.name;
        modalGenres.appendChild(pill);
      });
    }

    const bd = detail.backdrop_path;
    playerPoster.style.backgroundImage = bd ? `url('${backdropUrl(bd)}')` : '';

    // YouTube trailer
    let videos = videoData.results || [];
    videos.sort((a, b) => {
      const score = (v) =>
        v.type === 'Trailer' && v.site === 'YouTube'
          ? 0
          : v.type === 'Teaser' && v.site === 'YouTube'
            ? 1
            : v.site === 'YouTube'
              ? 2
              : 3;
      return score(a) - score(b);
    });
    const ytKey = videos.length ? videos[0].key : null;

    const playTrailer = () => {
      if (!ytKey) {
        showToast('Trailer not available.');
        return;
      }
      playerPlaceh.style.display = 'none';
      streamContainer.style.display = 'none';
      ytContainer.style.display = 'block';
      streamIframe.src = '';
      currentStream = null;
      let origin = window.location.origin;
      if (origin === 'null' || origin === 'file://') origin = 'https://hisyam.tv';
      ytIframe.src = `https://www.youtube.com/embed/${ytKey}?autoplay=1&rel=0&modestbranding=1&origin=${origin}`;
      const extLink = document.getElementById('yt-ext-link');
      if (extLink) extLink.href = `https://www.youtube.com/watch?v=${ytKey}`;
    };

    playerPlayBig.onclick = () => loadStream(id, type);
    modalPlayBtn.onclick = playTrailer;

    // ── Action buttons ──
    const modalActions = document.querySelector('.modal-actions');

    // Watch Now button
    const watchBtn = document.createElement('button');
    watchBtn.className = 'btn-watch';
    watchBtn.id = 'watch-now-btn';
    watchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Watch Now`;
    watchBtn.onclick = () => {
      if (type === 'tv') {
        const selSeason = document.getElementById('sel-season');
        const s = selSeason ? parseInt(selSeason.value) : 1;
        const e = currentEps.length ? currentEps[0].episode_number : 1;
        loadStream(id, type, s, e);
      } else {
        loadStream(id, type);
      }
    };
    modalActions.appendChild(watchBtn);

    // Watchlist button
    const wlBtn = document.createElement('button');
    wlBtn.className = 'btn-watchlist';
    wlBtn.id = 'watchlist-btn';
    const inList = isInWatchlist(id);
    wlBtn.innerHTML = inList
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> In My List`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> My List`;
    if (inList) wlBtn.classList.add('active');
    wlBtn.onclick = () => {
      const added = toggleWatchlist(currentItem);
      wlBtn.classList.toggle('active', added);
      wlBtn.innerHTML = added
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> In My List`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> My List`;
      // Dispatch event for nav watchlist badge update
      window.dispatchEvent(new CustomEvent('watchlist-changed'));
    };
    modalActions.appendChild(wlBtn);

    // ── Server picker ──
    const actionsDiv = document.createElement('div');
    actionsDiv.id = 'stream-actions';
    actionsDiv.className = 'stream-actions';
    const serverWrap = document.createElement('div');
    serverWrap.className = 'server-wrap';
    serverWrap.innerHTML = '<span class="server-label">Server:</span>';
    STREAMING_SERVERS.forEach((srv, i) => {
      const btn = document.createElement('button');
      btn.className = 'server-btn' + (i === activeServer ? ' active' : '');
      btn.textContent = srv.name;
      btn.onclick = () => switchServer(i);
      serverWrap.appendChild(btn);
    });
    actionsDiv.appendChild(serverWrap);

    // ── Episode selector for TV ──
    const modalDetail = document.querySelector('.modal-detail');
    const similarSection = document.getElementById('modal-similar-section');

    if (type === 'tv' && detail.number_of_seasons) {
      const epSelector = document.createElement('div');
      epSelector.id = 'episode-selector';
      epSelector.className = 'episode-block';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'episode-block__header';

      const titleEl = document.createElement('h3');
      titleEl.textContent = 'Episodes';
      titleEl.className = 'episode-block__title';

      const selSeason = document.createElement('select');
      selSeason.id = 'sel-season';
      selSeason.className = 'ep-select';

      const validSeasons = (detail.seasons || []).filter((s) => s.season_number > 0);
      const seasonsCount =
        validSeasons.length > 0
          ? validSeasons
          : Array.from({ length: detail.number_of_seasons }, (_, i) => ({
              season_number: i + 1,
            }));

      seasonsCount.forEach((s) => {
        const opt = document.createElement('option');
        opt.value = s.season_number;
        opt.textContent = `Season ${s.season_number}`;
        selSeason.appendChild(opt);
      });

      headerDiv.appendChild(titleEl);
      headerDiv.appendChild(selSeason);
      epSelector.appendChild(headerDiv);

      const epsContainer = document.createElement('div');
      epsContainer.id = 'eps-container';
      epsContainer.className = 'eps-container';
      epSelector.appendChild(epsContainer);

      if (seasonsCount.length > 0) {
        fetchEpisodes(id, seasonsCount[0].season_number);
      }
      selSeason.addEventListener('change', () =>
        fetchEpisodes(id, parseInt(selSeason.value))
      );

      watchBtn.onclick = () => {
        loadStream(
          id,
          type,
          selSeason.value,
          currentEps.length ? currentEps[0].episode_number : 1
        );
        renderEpisodesList(id, parseInt(selSeason.value));
      };

      modalDetail.insertBefore(actionsDiv, similarSection);
      modalDetail.insertBefore(epSelector, similarSection);
    } else {
      modalDetail.insertBefore(actionsDiv, similarSection);
    }

    if (autoPlay) setTimeout(() => loadStream(id, type), 300);

    // Similar
    if (similar.results?.length) {
      similar.results.slice(0, 12).forEach((s) => {
        const sc = document.createElement('div');
        sc.className = 'similar-card';
        sc.innerHTML = `
          <img class="similar-poster" src="${posterUrl(s.poster_path)}" alt="${s.title || s.name}" loading="lazy">
          <div class="similar-name">${s.title || s.name || ''}</div>`;
        sc.addEventListener('click', () => openModal(s.id, type));
        similarGrid.appendChild(sc);
      });
    }
  } catch (e) {
    modalTitle.textContent = 'Failed to load data.';
    console.error(e);
  }
}

export function closeModal() {
  ensureRefs();
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  currentStream = null;
  setTimeout(() => {
    ytIframe.src = '';
    streamIframe.src = '';
    const extLink = document.getElementById('yt-ext-link');
    if (extLink) extLink.href = '#';
    ytContainer.style.display = 'none';
    streamContainer.style.display = 'none';
    playerPlaceh.style.display = 'block';
  }, 300);
}

export function initModal() {
  ensureRefs();
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
