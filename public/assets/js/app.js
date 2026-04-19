// ============================================================
// HISYAM TV — app.js
// All-in-one: config, API, router, views, features
// No build tools, no imports — just plain JS
// ============================================================

(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  var TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8';
  var TMDB_BASE = 'https://api.themoviedb.org/3';
  var IMG_BASE = 'https://image.tmdb.org/t/p';
  var IMG_W500 = IMG_BASE + '/w500';
  var IMG_W1280 = IMG_BASE + '/w1280';

  var STREAMING_SERVERS = [
    {
      name: '2embed',
      movieUrl: function (id) { return 'https://www.2embed.cc/embed/' + id; },
      tvUrl: function (id, s, e) { return 'https://www.2embed.cc/embedtv/' + id + '&s=' + s + '&e=' + e; },
    },
    {
      name: 'VidSrc',
      movieUrl: function (id) { return 'https://vidsrc.to/embed/movie/' + id; },
      tvUrl: function (id, s, e) { return 'https://vidsrc.to/embed/tv/' + id + '/' + s + '/' + e; },
    },
    {
      name: 'VidSrc Pro',
      movieUrl: function (id) { return 'https://vidsrc.pro/embed/movie/' + id; },
      tvUrl: function (id, s, e) { return 'https://vidsrc.pro/embed/tv/' + id + '/' + s + '/' + e; },
    },
    {
      name: 'Smashy',
      movieUrl: function (id) { return 'https://embed.smashystream.com/playere.php?tmdb=' + id; },
      tvUrl: function (id, s, e) { return 'https://embed.smashystream.com/playere.php?tmdb=' + id + '&season=' + s + '&episode=' + e; },
    },
    {
      name: 'Embed.su',
      movieUrl: function (id) { return 'https://embed.su/embed/movie/' + id; },
      tvUrl: function (id, s, e) { return 'https://embed.su/embed/tv/' + id + '/' + s + '/' + e; },
    },
  ];

  var GENRES = {
    action: 28,
    comedy: 35,
    horror: 27,
    scifi: 878,
    anime: 16,
    drama: 18,
    romance: 10749,
    thriller: 53,
  };

  var WATCHLIST_KEY = 'hisyamtv_watchlist';
  var HISTORY_KEY = 'hisyamtv_history';

  // ============================================================
  // API helpers
  // ============================================================
  function tmdb(path, params, lang) {
    params = params || {};
    lang = lang || 'en-US';
    var url = new URL(TMDB_BASE + path);
    url.searchParams.set('api_key', TMDB_API_KEY);
    url.searchParams.set('language', lang);
    Object.keys(params).forEach(function (k) {
      url.searchParams.set(k, params[k]);
    });
    return fetch(url.toString())
      .then(function (res) {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .catch(function (e) {
        console.warn('[TMDB] fetch error', path, e.message);
        return { results: [] };
      });
  }

  function posterUrl(path) {
    return path
      ? IMG_W500 + path
      : 'https://via.placeholder.com/300x450/111118/333344?text=No+Poster';
  }

  function backdropUrl(path) {
    return path ? IMG_W1280 + path : '';
  }

  function getYear(date) {
    return date ? new Date(date).getFullYear() : '';
  }

  function getRating(vote) {
    return vote ? vote.toFixed(1) : 'N/A';
  }

  // ============================================================
  // TOAST
  // ============================================================
  var toastEl = null;
  var toastTimer = null;

  function showToast(msg, duration) {
    duration = duration || 2500;
    if (!toastEl) toastEl = document.getElementById('toast');
    if (!toastEl) return;
    clearTimeout(toastTimer);
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, duration);
  }

  // ============================================================
  // WATCHLIST & HISTORY (localStorage)
  // ============================================================
  function getList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function getWatchlist() {
    return getList(WATCHLIST_KEY);
  }

  function isInWatchlist(id) {
    return getWatchlist().some(function (item) { return item.id == id; });
  }

  function toggleWatchlist(item) {
    var list = getWatchlist();
    var idx = list.findIndex(function (i) { return i.id == item.id; });
    if (idx > -1) {
      list.splice(idx, 1);
      saveList(WATCHLIST_KEY, list);
      showToast('Removed from My List');
      updateWatchlistBadge();
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
    updateWatchlistBadge();
    return true;
  }

  function addToHistory(item) {
    var list = getList(HISTORY_KEY).filter(function (i) { return i.id != item.id; });
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

  function updateWatchlistBadge() {
    var badge = document.getElementById('wl-badge');
    if (!badge) return;
    var count = getWatchlist().length;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
  }

  // ============================================================
  // CARD creation & skeletons
  // ============================================================
  function createCard(item, mediaType) {
    var type = mediaType || item.media_type || 'movie';
    var title = item.title || item.name || 'Untitled';
    var year = getYear(item.release_date || item.first_air_date);
    var rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

    var card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', item.id);
    card.setAttribute('data-type', type);
    card.innerHTML =
      '<img class="card-poster" src="' + posterUrl(item.poster_path) + '" alt="' + title.replace(/"/g, '&quot;') + '" loading="lazy">' +
      '<div class="card-body">' +
        '<div class="card-title">' + title + '</div>' +
        '<div class="card-meta">' +
          '<span class="card-year">' + year + '</span>' +
          '<span class="card-rating">' + '\u2605 ' + rating + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="card-overlay">' +
        '<div class="card-play-icon">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
        '</div>' +
      '</div>';

    card.addEventListener('click', function () {
      navigate('#' + type + '/' + item.id);
    });
    return card;
  }

  function createSkeletons(count) {
    count = count || 10;
    var arr = [];
    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      el.className = 'skeleton-card';
      el.innerHTML =
        '<div class="skeleton-poster"></div>' +
        '<div class="skeleton-body">' +
          '<div class="skeleton-line"></div>' +
          '<div class="skeleton-line short"></div>' +
        '</div>';
      arr.push(el);
    }
    return arr;
  }

  function renderSkeletonsInRow(rowId) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';
    var skRow = document.createElement('div');
    skRow.className = 'card-skeleton-row';
    createSkeletons(10).forEach(function (s) { skRow.appendChild(s); });
    row.appendChild(skRow);
  }

  function renderRow(rowId, items, mediaType) {
    var row = document.getElementById(rowId);
    if (!row) return;
    row.innerHTML = '';
    if (!items || items.length === 0) {
      row.innerHTML = '<p style="color:var(--text-muted);padding:20px 0">No content available</p>';
      return;
    }
    items.forEach(function (item) {
      row.appendChild(createCard(item, mediaType));
    });
  }

  function renderSkeletonsInGrid(gridEl, count) {
    count = count || 12;
    gridEl.innerHTML = '';
    createSkeletons(count).forEach(function (s) {
      s.style.width = '100%';
      gridEl.appendChild(s);
    });
  }

  // ============================================================
  // ROUTER — hash-based
  // ============================================================
  // Routes:
  //   #home          — homepage with hero + rows
  //   #movies        — popular movies grid
  //   #series        — popular series grid
  //   #trending      — trending grid
  //   #mylist        — watchlist grid
  //   #movie/{id}    — movie detail page
  //   #tv/{id}       — TV detail page
  //   #search/{q}    — search results
  //   (empty hash)   — same as #home

  var currentRoute = '';

  function navigate(hash) {
    window.location.hash = hash;
  }

  function goBack() {
    // Use real browser history — so movie1→movie2→back=movie1→back=home
    history.back();
  }

  function parseRoute() {
    var hash = window.location.hash || '#home';
    if (hash === '#' || hash === '') hash = '#home';

    var parts = hash.substring(1).split('/');
    var page = parts[0];
    var param = parts.slice(1).join('/');

    return { page: page, param: param, full: hash };
  }

  function handleRoute() {
    var route = parseRoute();

    currentRoute = route.full;

    // Close mobile nav if open
    var mobileNav = document.getElementById('mobile-nav');
    if (mobileNav) mobileNav.classList.remove('open');

    // Close search suggestions
    var suggBox = document.getElementById('search-suggestions');
    if (suggBox) suggBox.classList.remove('active');

    // Update active nav link
    updateActiveNav(route.page);

    // Route to the right view
    switch (route.page) {
      case 'home':
        showHomeView();
        break;
      case 'movies':
        showGridView('Popular Movies', function () {
          return tmdb('/movie/popular', { page: 1 });
        }, 'movie');
        break;
      case 'series':
        showGridView('Popular Series', function () {
          return tmdb('/tv/popular', { page: 1 });
        }, 'tv');
        break;
      case 'trending':
        showGridView('Trending', function () {
          return tmdb('/trending/all/week');
        }, null);
        break;
      case 'mylist':
        showMyListView();
        break;
      case 'movie':
        showDetailView(route.param, 'movie');
        break;
      case 'tv':
        showDetailView(route.param, 'tv');
        break;
      case 'search':
        showSearchView(decodeURIComponent(route.param));
        break;
      default:
        showHomeView();
        break;
    }
  }

  function updateActiveNav(page) {
    var navPage = page;
    // Detail pages don't highlight any nav
    if (page === 'movie' || page === 'tv' || page === 'search') navPage = '';

    document.querySelectorAll('.nav-link').forEach(function (l) {
      l.classList.remove('active');
      if (l.getAttribute('data-section') === navPage) {
        l.classList.add('active');
      }
    });
  }

  // ============================================================
  // VIEW SWITCHING
  // ============================================================
  var views = ['home-view', 'grid-view', 'detail-view'];

  function showView(viewId) {
    views.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = id === viewId ? '' : 'none';
    });
    // Show/hide hero
    var hero = document.getElementById('hero');
    if (hero) hero.style.display = viewId === 'home-view' ? '' : 'none';
    // Show/hide main (home rows)
    var main = document.getElementById('main-content');
    if (main) main.style.display = viewId === 'home-view' ? '' : 'none';

    // Kill any playing iframes when leaving detail view
    if (viewId !== 'detail-view') {
      var ytIframe = document.getElementById('youtube-iframe');
      var streamIframe = document.getElementById('stream-iframe');
      if (ytIframe) ytIframe.src = '';
      if (streamIframe) streamIframe.src = '';
      currentStream = null;
    }

    // Reset document title when not on detail page
    if (viewId !== 'detail-view') {
      document.title = 'Hisyam TV \u2014 Stream Anything';
    }

    // Always force navbar scrolled state on non-home views
    var navbar = document.getElementById('navbar');
    if (navbar) {
      if (viewId !== 'home-view') {
        navbar.classList.add('scrolled');
      } else {
        // Re-evaluate scroll position
        if (window.scrollY > 50) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }
    }

    window.scrollTo({ top: 0 });
  }

  // ============================================================
  // HOME VIEW
  // ============================================================
  var heroLoaded = false;
  var loadedRows = {};

  var ROW_CONFIG = [
    { id: 'row-trending',  fetch: function () { return tmdb('/trending/all/week'); },                                   type: null    },
    { id: 'row-newest',    fetch: function () { return tmdb('/movie/now_playing'); },                                    type: 'movie' },
    { id: 'row-movies',    fetch: function () { return tmdb('/movie/popular'); },                                        type: 'movie' },
    { id: 'row-series',    fetch: function () { return tmdb('/tv/popular'); },                                           type: 'tv'    },
    { id: 'row-toprated',  fetch: function () { return tmdb('/movie/top_rated'); },                                      type: 'movie' },
    { id: 'row-action',    fetch: function () { return tmdb('/discover/movie', { with_genres: GENRES.action }); },       type: 'movie' },
    { id: 'row-horror',    fetch: function () { return tmdb('/discover/movie', { with_genres: GENRES.horror }); },       type: 'movie' },
    { id: 'row-comedy',    fetch: function () { return tmdb('/discover/movie', { with_genres: GENRES.comedy }); },       type: 'movie' },
    { id: 'row-scifi',     fetch: function () { return tmdb('/discover/movie', { with_genres: GENRES.scifi }); },        type: 'movie' },
    { id: 'row-anime',     fetch: function () { return tmdb('/discover/tv',    { with_genres: GENRES.anime }); },        type: 'tv'    },
    { id: 'row-drama',     fetch: function () { return tmdb('/discover/movie', { with_genres: GENRES.drama }); },        type: 'movie' },
    { id: 'row-romance',   fetch: function () { return tmdb('/discover/movie', { with_genres: GENRES.romance }); },      type: 'movie' },
    { id: 'row-thriller',  fetch: function () { return tmdb('/discover/movie', { with_genres: GENRES.thriller }); },     type: 'movie' },
  ];

  var lazyObserver = null;

  function showHomeView() {
    showView('home-view');

    if (!heroLoaded) {
      heroLoaded = true;
      loadHero();
      // Show skeletons for all rows
      ROW_CONFIG.forEach(function (cfg) { renderSkeletonsInRow(cfg.id); });
      setupLazyRows();
    }
  }

  function loadRow(cfg) {
    if (loadedRows[cfg.id]) return;
    loadedRows[cfg.id] = true;
    cfg.fetch().then(function (data) {
      renderRow(cfg.id, data.results, cfg.type);
    });
  }

  function setupLazyRows() {
    // Load first 3 immediately
    ROW_CONFIG.slice(0, 3).forEach(function (cfg) { loadRow(cfg); });

    // Lazy load the rest
    var lazyRows = ROW_CONFIG.slice(3);

    if (!('IntersectionObserver' in window)) {
      // Fallback: load all
      lazyRows.forEach(function (cfg) { loadRow(cfg); });
      return;
    }

    lazyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var rowEl = entry.target.querySelector('.card-row');
        if (!rowEl) return;
        var cfg = lazyRows.find(function (r) { return r.id === rowEl.id; });
        if (cfg && !loadedRows[cfg.id]) {
          loadRow(cfg);
          lazyObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '300px 0px' });

    lazyRows.forEach(function (cfg) {
      var row = document.getElementById(cfg.id);
      if (row && row.parentElement) {
        lazyObserver.observe(row.parentElement);
      }
    });
  }

  // ── Hero ──
  var heroItem = null;

  function loadHero() {
    var heroBd = document.getElementById('hero-backdrop');
    var heroTitle = document.getElementById('hero-title');
    var heroOverview = document.getElementById('hero-overview');
    var heroRating = document.getElementById('hero-rating');
    var heroYear = document.getElementById('hero-year');
    var heroType = document.getElementById('hero-type');

    tmdb('/trending/all/week').then(function (data) {
      if (!data.results || !data.results.length) return;

      var item = data.results[Math.floor(Math.random() * Math.min(10, data.results.length))];
      heroItem = item;

      var type = item.media_type || 'movie';
      var title = item.title || item.name || '';
      var year = getYear(item.release_date || item.first_air_date);

      heroBd.style.backgroundImage = "url('" + backdropUrl(item.backdrop_path) + "')";
      heroTitle.textContent = title;
      heroOverview.textContent = item.overview || 'Curated content for you.';
      heroRating.textContent = '\u2605 ' + getRating(item.vote_average);
      heroYear.textContent = year;
      heroType.textContent = type === 'tv' ? 'SERIES' : 'MOVIE';

      document.getElementById('hero-play-btn').onclick = function () {
        navigate('#' + type + '/' + item.id);
      };
      document.getElementById('hero-info-btn').onclick = function () {
        navigate('#' + type + '/' + item.id);
      };
    });
  }

  // ============================================================
  // GRID VIEW (Movies, Series, Trending pages)
  // ============================================================
  function showGridView(title, fetchFn, mediaType) {
    showView('grid-view');
    var container = document.getElementById('grid-view');
    container.innerHTML =
      '<div class="grid-view-container">' +
        '<h2 class="grid-view-title">' + title + '</h2>' +
        '<div class="card-grid" id="grid-cards"></div>' +
      '</div>';

    var grid = document.getElementById('grid-cards');
    renderSkeletonsInGrid(grid, 12);

    fetchFn().then(function (data) {
      grid.innerHTML = '';
      var items = data.results || [];
      if (!items.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;grid-column:1/-1">No content available</p>';
        return;
      }
      items.forEach(function (item) {
        grid.appendChild(createCard(item, mediaType || item.media_type));
      });
    });
  }

  // ============================================================
  // MY LIST VIEW
  // ============================================================
  function showMyListView() {
    showView('grid-view');
    var container = document.getElementById('grid-view');
    container.innerHTML =
      '<div class="grid-view-container">' +
        '<h2 class="grid-view-title">My List</h2>' +
        '<div class="card-grid" id="grid-cards"></div>' +
      '</div>';

    var grid = document.getElementById('grid-cards');
    var list = getWatchlist();

    if (!list.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);padding:40px 0;grid-column:1/-1;text-align:center;font-size:16px;">Your list is empty. Add movies and series to watch later.</p>';
      return;
    }
    list.forEach(function (item) {
      var card = createCard(item, item.media_type);
      // Add remove button
      var removeBtn = document.createElement('button');
      removeBtn.className = 'card-remove-btn';
      removeBtn.setAttribute('aria-label', 'Remove from My List');
      removeBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
          '<line x1="18" y1="6" x2="6" y2="18"/>' +
          '<line x1="6" y1="6" x2="18" y2="18"/>' +
        '</svg>';
      removeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleWatchlist(item);
        card.classList.add('card-removing');
        setTimeout(function () {
          showMyListView();
        }, 300);
      });
      card.style.position = 'relative';
      card.appendChild(removeBtn);
      grid.appendChild(card);
    });
  }

  // ============================================================
  // SEARCH VIEW
  // ============================================================
  function showSearchView(query) {
    if (!query || query.length < 2) {
      navigate('#home');
      return;
    }

    showView('grid-view');
    var container = document.getElementById('grid-view');
    container.innerHTML =
      '<div class="grid-view-container">' +
        '<h2 class="grid-view-title">Search: "' + query.replace(/</g, '&lt;') + '"</h2>' +
        '<div class="card-grid" id="grid-cards"></div>' +
      '</div>';

    var grid = document.getElementById('grid-cards');
    renderSkeletonsInGrid(grid, 8);

    tmdb('/search/multi', { query: query, include_adult: false }).then(function (data) {
      grid.innerHTML = '';
      var filtered = (data.results || []).filter(function (r) {
        return (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path;
      });

      if (!filtered.length) {
        grid.innerHTML = '<p style="color:var(--text-muted);padding:20px 0;grid-column:1/-1">No results for "' + query.replace(/</g, '&lt;') + '"</p>';
        return;
      }
      filtered.forEach(function (item) {
        grid.appendChild(createCard(item, item.media_type));
      });
    });
  }

  // ============================================================
  // DETAIL VIEW — full page (replaces modal)
  // ============================================================
  var activeServer = 0;
  var currentStream = null;
  var currentDetailItem = null;
  var currentEps = [];

  function showDetailView(id, type) {
    showView('detail-view');
    var container = document.getElementById('detail-view');

    // Build the detail page HTML
    container.innerHTML =
      '<div class="detail-page">' +
        // Back button
        '<button class="detail-back-btn" id="detail-back">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>' +
          ' Back' +
        '</button>' +
        // Player
        '<div class="player-wrapper" id="player-wrapper">' +
          '<div class="player-placeholder" id="player-placeholder">' +
            '<div class="player-poster" id="player-poster"></div>' +
            '<button class="player-play-big" id="player-play-big">' +
              '<svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
            '</button>' +
            '<span class="player-play-label">Play</span>' +
          '</div>' +
          '<div class="youtube-container" id="youtube-container" style="display:none">' +
            '<iframe id="youtube-iframe" src="" frameborder="0" allowfullscreen allow="autoplay; encrypted-media"></iframe>' +
            '<a id="yt-ext-link" href="#" target="_blank" rel="noopener" class="yt-ext-link">Open in YouTube \u2197</a>' +
          '</div>' +
          '<div class="stream-container" id="stream-container" style="display:none">' +
            '<iframe id="stream-iframe" src="" frameborder="0" allowfullscreen allow="autoplay; encrypted-media; fullscreen; picture-in-picture"></iframe>' +
          '</div>' +
        '</div>' +
        // Info
        '<div class="detail-info" id="detail-info">' +
          '<div class="detail-meta">' +
            '<span class="detail-year" id="detail-year"></span>' +
            '<span class="detail-runtime" id="detail-runtime"></span>' +
            '<span class="detail-rating" id="detail-rating"></span>' +
            '<span class="detail-type-badge" id="detail-type"></span>' +
          '</div>' +
          '<h1 class="detail-title" id="detail-title">Loading...</h1>' +
          '<p class="detail-overview" id="detail-overview"></p>' +
          '<div class="detail-genres" id="detail-genres"></div>' +
          '<div class="detail-actions" id="detail-actions"></div>' +
          '<div id="stream-actions-wrap"></div>' +
          '<div id="episode-selector-wrap"></div>' +
          '<div class="detail-similar" id="detail-similar" style="display:none">' +
            '<h3 class="similar-title">Similar</h3>' +
            '<div class="similar-grid" id="similar-grid"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    // Back button
    document.getElementById('detail-back').addEventListener('click', function () {
      goBack();
    });

    // Reset state
    activeServer = 0;
    currentStream = null;
    currentEps = [];

    // Fetch detail
    loadDetail(id, type);
  }

  function loadDetail(id, type) {
    Promise.all([
      tmdb('/' + type + '/' + id, { append_to_response: 'credits' }),
      tmdb('/' + type + '/' + id + '/videos', {}, 'en-US'),
      tmdb('/' + type + '/' + id + '/similar'),
    ]).then(function (results) {
      var detail = results[0];
      var videoData = results[1];
      var similar = results[2];

      currentDetailItem = Object.assign({}, detail, { media_type: type });

      // Add to history
      addToHistory(currentDetailItem);

      var title = detail.title || detail.name || '';
      var year = getYear(detail.release_date || detail.first_air_date);
      var runtime = detail.runtime
        ? Math.floor(detail.runtime / 60) + 'h ' + (detail.runtime % 60) + 'm'
        : detail.number_of_seasons
          ? detail.number_of_seasons + ' Season' + (detail.number_of_seasons > 1 ? 's' : '')
          : '';
      var rating = detail.vote_average ? detail.vote_average.toFixed(1) : 'N/A';

      // Update document title
      document.title = title + ' \u2014 Hisyam TV';

      // Fill in info
      document.getElementById('detail-title').textContent = title;
      document.getElementById('detail-overview').textContent = detail.overview || 'No description available.';
      document.getElementById('detail-year').textContent = year;
      document.getElementById('detail-runtime').textContent = runtime;
      document.getElementById('detail-rating').textContent = '\u2605 ' + rating;
      document.getElementById('detail-type').textContent = type === 'tv' ? 'SERIES' : 'MOVIE';

      // Genres
      var genresEl = document.getElementById('detail-genres');
      genresEl.innerHTML = '';
      if (detail.genres && detail.genres.length) {
        detail.genres.forEach(function (g) {
          var pill = document.createElement('span');
          pill.className = 'genre-pill';
          pill.textContent = g.name;
          genresEl.appendChild(pill);
        });
      }

      // Poster backdrop
      var bd = detail.backdrop_path;
      var posterEl = document.getElementById('player-poster');
      posterEl.style.backgroundImage = bd ? "url('" + backdropUrl(bd) + "')" : '';

      // YouTube trailer
      var videos = (videoData.results || []).sort(function (a, b) {
        var score = function (v) {
          if (v.type === 'Trailer' && v.site === 'YouTube') return 0;
          if (v.type === 'Teaser' && v.site === 'YouTube') return 1;
          if (v.site === 'YouTube') return 2;
          return 3;
        };
        return score(a) - score(b);
      });
      var ytKey = videos.length ? videos[0].key : null;

      function playTrailer() {
        if (!ytKey) {
          showToast('Trailer not available.');
          return;
        }
        document.getElementById('player-placeholder').style.display = 'none';
        document.getElementById('stream-container').style.display = 'none';
        document.getElementById('youtube-container').style.display = 'block';
        document.getElementById('stream-iframe').src = '';
        currentStream = null;
        var origin = window.location.origin;
        if (origin === 'null' || origin === 'file://') origin = 'https://hisyam.tv';
        document.getElementById('youtube-iframe').src =
          'https://www.youtube.com/embed/' + ytKey + '?autoplay=1&rel=0&modestbranding=1&origin=' + origin;
        var extLink = document.getElementById('yt-ext-link');
        if (extLink) extLink.href = 'https://www.youtube.com/watch?v=' + ytKey;
      }

      // Play big button = start stream
      document.getElementById('player-play-big').onclick = function () {
        loadStream(id, type);
      };

      // Action buttons
      var actionsEl = document.getElementById('detail-actions');
      actionsEl.innerHTML = '';

      // Play Trailer button
      var trailerBtn = document.createElement('button');
      trailerBtn.className = 'btn-trailer';
      trailerBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Play Trailer';
      trailerBtn.onclick = playTrailer;
      actionsEl.appendChild(trailerBtn);

      // Watch Now button
      var watchBtn = document.createElement('button');
      watchBtn.className = 'btn-watch';
      watchBtn.id = 'watch-now-btn';
      watchBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Watch Now';
      watchBtn.onclick = function () {
        if (type === 'tv') {
          var selSeason = document.getElementById('sel-season');
          var s = selSeason ? parseInt(selSeason.value) : 1;
          var e = currentEps.length ? currentEps[0].episode_number : 1;
          loadStream(id, type, s, e);
        } else {
          loadStream(id, type);
        }
      };
      actionsEl.appendChild(watchBtn);

      // Watchlist button
      var wlBtn = document.createElement('button');
      wlBtn.className = 'btn-watchlist';
      var inList = isInWatchlist(id);
      function updateWlBtn(active) {
        wlBtn.classList.toggle('active', active);
        wlBtn.innerHTML = active
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> In My List'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> My List';
      }
      updateWlBtn(inList);
      wlBtn.onclick = function () {
        var added = toggleWatchlist(currentDetailItem);
        updateWlBtn(added);
      };
      actionsEl.appendChild(wlBtn);

      // Server picker
      var serverWrap = document.getElementById('stream-actions-wrap');
      serverWrap.innerHTML = '';
      var actionsDiv = document.createElement('div');
      actionsDiv.className = 'stream-actions';
      var sWrap = document.createElement('div');
      sWrap.className = 'server-wrap';
      sWrap.innerHTML = '<span class="server-label">Server:</span>';
      STREAMING_SERVERS.forEach(function (srv, i) {
        var btn = document.createElement('button');
        btn.className = 'server-btn' + (i === activeServer ? ' active' : '');
        btn.textContent = srv.name;
        btn.onclick = function () { switchServer(i, id, type); };
        sWrap.appendChild(btn);
      });
      actionsDiv.appendChild(sWrap);
      serverWrap.appendChild(actionsDiv);

      // Episode selector for TV
      var epWrap = document.getElementById('episode-selector-wrap');
      epWrap.innerHTML = '';

      if (type === 'tv' && detail.number_of_seasons) {
        var epBlock = document.createElement('div');
        epBlock.className = 'episode-block';

        var headerDiv = document.createElement('div');
        headerDiv.className = 'episode-block__header';

        var epTitle = document.createElement('h3');
        epTitle.className = 'episode-block__title';
        epTitle.textContent = 'Episodes';

        var selSeason = document.createElement('select');
        selSeason.id = 'sel-season';
        selSeason.className = 'ep-select';

        var validSeasons = (detail.seasons || []).filter(function (s) { return s.season_number > 0; });
        var seasonsArr = validSeasons.length > 0
          ? validSeasons
          : Array.from({ length: detail.number_of_seasons }, function (_, i) { return { season_number: i + 1 }; });

        seasonsArr.forEach(function (s) {
          var opt = document.createElement('option');
          opt.value = s.season_number;
          opt.textContent = 'Season ' + s.season_number;
          selSeason.appendChild(opt);
        });

        headerDiv.appendChild(epTitle);
        headerDiv.appendChild(selSeason);
        epBlock.appendChild(headerDiv);

        var epsContainer = document.createElement('div');
        epsContainer.id = 'eps-container';
        epsContainer.className = 'eps-container';
        epBlock.appendChild(epsContainer);

        epWrap.appendChild(epBlock);

        if (seasonsArr.length > 0) {
          fetchEpisodes(id, seasonsArr[0].season_number);
        }

        selSeason.addEventListener('change', function () {
          fetchEpisodes(id, parseInt(selSeason.value));
        });

        // Update Watch Now for TV
        watchBtn.onclick = function () {
          var s = parseInt(selSeason.value);
          var e = currentEps.length ? currentEps[0].episode_number : 1;
          loadStream(id, type, s, e);
          renderEpisodesList(id, s);
        };
      }

      // Similar
      var similarSection = document.getElementById('detail-similar');
      var similarGridEl = document.getElementById('similar-grid');
      similarGridEl.innerHTML = '';

      if (similar.results && similar.results.length) {
        similarSection.style.display = '';
        similar.results.slice(0, 12).forEach(function (s) {
          var sc = document.createElement('div');
          sc.className = 'similar-card';
          sc.innerHTML =
            '<img class="similar-poster" src="' + posterUrl(s.poster_path) + '" alt="' + (s.title || s.name || '').replace(/"/g, '&quot;') + '" loading="lazy">' +
            '<div class="similar-name">' + (s.title || s.name || '') + '</div>';
          sc.addEventListener('click', function () {
            navigate('#' + type + '/' + s.id);
          });
          similarGridEl.appendChild(sc);
        });
      }
    }).catch(function (e) {
      console.error('Failed to load detail:', e);
      var titleEl = document.getElementById('detail-title');
      if (titleEl) titleEl.textContent = 'Failed to load data.';
    });
  }

  // ── Streaming ──
  function buildStreamUrl(id, type, season, episode) {
    var srv = STREAMING_SERVERS[activeServer];
    return type === 'tv' ? srv.tvUrl(id, season || 1, episode || 1) : srv.movieUrl(id);
  }

  function loadStream(id, type, season, episode) {
    season = season || 1;
    episode = episode || 1;
    currentStream = { id: id, type: type, season: season, episode: episode };

    var ytContainer = document.getElementById('youtube-container');
    var placeholder = document.getElementById('player-placeholder');
    var streamContainer = document.getElementById('stream-container');
    var streamIframe = document.getElementById('stream-iframe');

    if (ytContainer) ytContainer.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    if (streamContainer) streamContainer.style.display = 'block';
    if (streamIframe) streamIframe.src = buildStreamUrl(id, type, season, episode);
  }

  function switchServer(idx, id, type) {
    activeServer = idx;
    document.querySelectorAll('.server-btn').forEach(function (b, i) {
      b.classList.toggle('active', i === idx);
    });
    if (currentStream) {
      var streamIframe = document.getElementById('stream-iframe');
      if (streamIframe) {
        streamIframe.src = buildStreamUrl(currentStream.id, currentStream.type, currentStream.season, currentStream.episode);
      }
      showToast('Switched to ' + STREAMING_SERVERS[idx].name);
    }
  }

  // ── Episodes ──
  function fetchEpisodes(tvId, seasonNum) {
    tmdb('/tv/' + tvId + '/season/' + seasonNum).then(function (sData) {
      currentEps = sData.episodes || [];
      renderEpisodesList(tvId, seasonNum);
    });
  }

  function renderEpisodesList(tvId, seasonNum) {
    var epsContainer = document.getElementById('eps-container');
    if (!epsContainer) return;
    epsContainer.innerHTML = '';

    if (!currentEps.length) {
      epsContainer.innerHTML = '<p style="color:#aaa;font-size:14px;">No episodes found.</p>';
      return;
    }

    currentEps.forEach(function (ep) {
      var isActive = currentStream &&
        currentStream.season == seasonNum &&
        currentStream.episode == ep.episode_number;
      var epCard = document.createElement('div');
      epCard.className = 'ep-card' + (isActive ? ' ep-card--active' : '');
      epCard.onclick = function () {
        loadStream(tvId, 'tv', seasonNum, ep.episode_number);
        renderEpisodesList(tvId, seasonNum);
      };
      var imgUrl = ep.still_path
        ? IMG_W500 + ep.still_path
        : 'https://via.placeholder.com/300x170/111118/333344?text=No+Image';
      var synopsis = ep.overview || 'No synopsis available.';
      epCard.innerHTML =
        '<img class="ep-card__img" src="' + imgUrl + '" alt="Episode ' + ep.episode_number + '">' +
        '<div class="ep-card__info">' +
          '<h4 class="ep-card__title">' + ep.episode_number + '. ' + ep.name + '</h4>' +
          '<p class="ep-card__synopsis">' + synopsis + '</p>' +
        '</div>';
      epsContainer.appendChild(epCard);
    });
  }

  // ============================================================
  // SEARCH — bar, suggestions
  // ============================================================
  var searchTimer = null;

  function initSearch() {
    var searchWrap = document.getElementById('search-wrap');
    var searchToggle = document.getElementById('search-toggle');
    var searchInput = document.getElementById('search-input');
    var suggBox = document.getElementById('search-suggestions');

    searchToggle.addEventListener('click', function () {
      var isOpen = searchWrap.classList.toggle('open');
      if (isOpen) {
        searchInput.focus();
      } else {
        searchInput.value = '';
        suggBox.classList.remove('active');
      }
    });

    searchInput.addEventListener('input', function (e) {
      clearTimeout(searchTimer);
      var q = e.target.value.trim();
      if (q.length < 2) {
        suggBox.classList.remove('active');
        return;
      }
      searchTimer = setTimeout(function () { showSuggestions(q); }, 400);
    });

    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(searchTimer);
        suggBox.classList.remove('active');
        var q = e.target.value.trim();
        if (q.length >= 2) {
          navigate('#search/' + encodeURIComponent(q));
          searchWrap.classList.remove('open');
          searchInput.value = '';
        }
      }
      if (e.key === 'Escape') {
        searchWrap.classList.remove('open');
        searchInput.value = '';
        suggBox.classList.remove('active');
      }
    });

    document.addEventListener('click', function (e) {
      if (!searchWrap.contains(e.target)) {
        suggBox.classList.remove('active');
      }
    });
  }

  function showSuggestions(query) {
    var suggBox = document.getElementById('search-suggestions');
    var searchWrap = document.getElementById('search-wrap');
    var searchInput = document.getElementById('search-input');

    tmdb('/search/multi', { query: query, include_adult: false }, 'en-US').then(function (data) {
      var filtered = (data.results || [])
        .filter(function (r) { return (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path; })
        .slice(0, 6);

      suggBox.innerHTML = '';
      if (!filtered.length) {
        suggBox.innerHTML = '<div style="padding:12px;color:#aaa;font-size:13px;text-align:center;">No matches found</div>';
      } else {
        filtered.forEach(function (item) {
          var type = item.media_type || 'movie';
          var year = (item.release_date || item.first_air_date || '').substring(0, 4);
          var title = item.title || item.name;
          var d = document.createElement('div');
          d.className = 'sugg-item';
          d.innerHTML =
            '<img src="' + posterUrl(item.poster_path) + '" class="sugg-img" alt="' + title.replace(/"/g, '&quot;') + '">' +
            '<div class="sugg-info">' +
              '<span class="sugg-title">' + title + '</span>' +
              '<span class="sugg-meta">' + year + ' \u00B7 ' + type.toUpperCase() + ' \u00B7 \u2605 ' + (item.vote_average ? item.vote_average.toFixed(1) : 'N/A') + '</span>' +
            '</div>';
          d.onclick = function () {
            navigate('#' + type + '/' + item.id);
            suggBox.classList.remove('active');
            searchInput.value = '';
            searchWrap.classList.remove('open');
          };
          suggBox.appendChild(d);
        });
      }
      suggBox.classList.add('active');
    });
  }

  // ============================================================
  // NAVIGATION — navbar, mobile menu, back-to-top, footer
  // ============================================================
  function initNavigation() {
    // Nav link clicks
    document.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var section = link.getAttribute('data-section');
        navigate('#' + section);
      });
    });

    // Logo click
    document.getElementById('logo-home').addEventListener('click', function (e) {
      e.preventDefault();
      navigate('#home');
    });

    // Navbar scroll effect
    window.addEventListener('scroll', function () {
      var navbar = document.getElementById('navbar');
      var route = parseRoute();
      if (route.page !== 'home' || window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });

    // Mobile menu
    var mobileToggle = document.getElementById('mobile-menu-toggle');
    var mobileNav = document.getElementById('mobile-nav');
    if (mobileToggle && mobileNav) {
      mobileToggle.addEventListener('click', function () {
        mobileNav.classList.toggle('open');
      });
      mobileNav.querySelectorAll('.nav-link').forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          mobileNav.classList.remove('open');
          var section = link.getAttribute('data-section');
          navigate('#' + section);
        });
      });
      document.addEventListener('click', function (e) {
        if (!mobileNav.contains(e.target) && !mobileToggle.contains(e.target)) {
          mobileNav.classList.remove('open');
        }
      });
    }

    // Back to top
    var backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      window.addEventListener('scroll', function () {
        backToTop.classList.toggle('visible', window.scrollY > 400);
      });
      backToTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Footer links
    var footerHome = document.getElementById('footer-home');
    var footerMovies = document.getElementById('footer-movies');
    var footerSeries = document.getElementById('footer-series');
    if (footerHome) footerHome.addEventListener('click', function (e) { e.preventDefault(); navigate('#home'); });
    if (footerMovies) footerMovies.addEventListener('click', function (e) { e.preventDefault(); navigate('#movies'); });
    if (footerSeries) footerSeries.addEventListener('click', function (e) { e.preventDefault(); navigate('#series'); });

    // Watchlist badge
    updateWatchlistBadge();
  }

  // ============================================================
  // KEYBOARD shortcut — Escape goes back from detail
  // ============================================================
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var route = parseRoute();
      if (route.page === 'movie' || route.page === 'tv') {
        goBack();
      }
    }
  });

  // ============================================================
  // POPUP BLOCKER — aggressive popup/redirect defense
  // ============================================================

  // 1) Override window.open — blocks most JS-triggered popups
  var _origOpen = window.open;
  window.open = function () {
    console.warn('[Popup Blocked] window.open blocked');
    return null;
  };

  // 2) Block clicks that try to open new windows via <a target="_blank">
  //    injected by embed scripts into our page (not inside iframe)
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var target = link.getAttribute('target') || '';
    // Allow our own links and YouTube
    if (href.indexOf('#') === 0 || href.indexOf('youtube.com') !== -1 ||
        href.indexOf('themoviedb.org') !== -1) return;
    // Block external popups from embed-injected elements
    if (target === '_blank' && link.closest('#stream-container, #youtube-container')) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('[Popup Blocked] link click blocked:', href);
    }
  }, true);

  // 3) Prevent focus-steal: embeds sometimes blur our window to redirect
  var _lastFocusTime = 0;
  window.addEventListener('blur', function () {
    _lastFocusTime = Date.now();
    // Re-focus after a short delay if an embed stole focus
    setTimeout(function () {
      if (Date.now() - _lastFocusTime < 200) {
        window.focus();
      }
    }, 100);
  });

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener('DOMContentLoaded', function () {
    initSearch();
    initNavigation();

    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);

    // Handle initial route
    handleRoute();

    // Dismiss splash screen after content starts loading
    setTimeout(function () {
      var splash = document.getElementById('splash');
      if (splash) {
        splash.classList.add('hide');
        setTimeout(function () { splash.remove(); }, 600);
      }
    }, 1200);
  });

})();
